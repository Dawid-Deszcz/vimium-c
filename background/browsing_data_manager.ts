import {
  blank_, bookmarkCache_, Completion_, CurCVer_, historyCache_, OnChrome, OnEdge, OnFirefox, urlDecodingDict_,
  set_findBookmark, findBookmark, updateHooks_
} from "./store"
import { Tabs_, browser_, runtimeError_, browserSessions_ } from "./browser"
import * as BgUtils_ from "./utils"
import * as settings_ from "./settings"
import { MatchCacheManager_, MatchCacheType } from "./completion_utils"

import DecodedItem = CompletersNS.DecodedItem
import HistoryItem = CompletersNS.HistoryItem
import Bookmark = CompletersNS.Bookmark
import BookmarkStatus = CompletersNS.BookmarkStatus
import kVisibility = CompletersNS.kVisibility
import Domain = CompletersNS.Domain

declare const enum InnerConsts {
  bookmarkBasicDelay = 1000 * 60, bookmarkFurtherDelay = bookmarkBasicDelay / 2,
  historyMaxSize = 20000,
}
interface UrlDomain { domain_: string; scheme_: Urls.SchemeId }
type ItemToDecode = string | DecodedItem
export interface BrowserUrlItem {
  u: string; title_: string; visit_: number; sessionId_: CompletersNS.SessionId | null
}

const WithTextDecoder = !OnEdge && (Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder || !OnChrome
    || CurCVer_ > BrowserVer.MinEnsuredTextEncoderAndDecoder - 1 || !!globalThis.TextDecoder)
const _decodeFunc = decodeURIComponent
let decodingEnabled: boolean | undefined, decodingJobs: ItemToDecode[], decodingIndex = -1, dataUrlToDecode_ = "1"
let charsetDecoder_: TextDecoder | null = null
let omniBlockList: string[] | null = null, omniBlockListRe: RegExpOne | null = null

export { omniBlockList }

export const parseDomainAndScheme_ = (url: string): UrlDomain | null => {
  let scheme = url.slice(0, 5), d: Urls.SchemeId, i: number
  if (scheme === "https") { d = Urls.SchemeId.HTTPS }
  else if (scheme === "http:") { d = Urls.SchemeId.HTTP }
  else if (scheme.startsWith("ftp")) { d = Urls.SchemeId.FTP } // Firefox and Chrome doesn't support FTPS
  else { return null }
  i = url.indexOf("/", d)
  url = url.slice(d, i < 0 ? url.length : i)
  return { domain_: url !== "__proto__" ? url : ".__proto__", scheme_: d }
}

export const BookmarkManager_ = {
  currentSearch_: null as CompletersNS.QueryStatus | null,
  iterPath_: "",
  iterDepth_: 0,
  _timer: 0,
  onLoad_: null as (() => void) | null,
  Listen_: function (): void {
    const bBm = browser_.bookmarks
    if (OnEdge && !bBm.onCreated) { return }
    bBm.onCreated.addListener(BookmarkManager_.Delay_)
    bBm.onRemoved.addListener(BookmarkManager_.Expire_)
    bBm.onChanged.addListener(BookmarkManager_.Expire_)
    bBm.onMoved.addListener(BookmarkManager_.Delay_)
    if (OnChrome) {
      bBm.onImportBegan.addListener(function (): void {
        browser_.bookmarks.onCreated.removeListener(BookmarkManager_.Delay_)
      })
      bBm.onImportEnded.addListener(function (): void {
        browser_.bookmarks.onCreated.addListener(BookmarkManager_.Delay_)
        BookmarkManager_.Delay_()
      })
    }
  } as (() => void) | null,
  refresh_ (): void {
    const bBm = browser_.bookmarks
    if (OnFirefox && Build.MayAndroidOnFirefox && !bBm) {
      bookmarkCache_.status_ = BookmarkStatus.inited
      const callback = BookmarkManager_.onLoad_
      BookmarkManager_.onLoad_ = null
      callback && callback()
      return
    }
    bookmarkCache_.status_ = BookmarkStatus.initing
    if (BookmarkManager_._timer) {
      clearTimeout(BookmarkManager_._timer)
      BookmarkManager_._timer = 0
    }
    browser_.bookmarks.getTree(BookmarkManager_.readTree_)
  },
  readTree_ (tree: chrome.bookmarks.BookmarkTreeNode[]): void {
    bookmarkCache_.bookmarks_ = []
    bookmarkCache_.dirs_ = []
    bookmarkCache_.status_ = BookmarkStatus.inited
    MatchCacheManager_.clear_(MatchCacheType.bookmarks)
    tree.forEach(BookmarkManager_.traverseBookmark_, BookmarkManager_)
    setTimeout(() => UrlDecoder_.decodeList_(bookmarkCache_.bookmarks_), 50)
    if (BookmarkManager_.Listen_) {
      setTimeout(BookmarkManager_.Listen_, 0)
      BookmarkManager_.Listen_ = null
    }
    const callback = BookmarkManager_.onLoad_
    BookmarkManager_.onLoad_ = null
    callback && callback()
  },
  traverseBookmark_ (bookmark: chrome.bookmarks.BookmarkTreeNode): void {
    const rawTitle = bookmark.title, id = bookmark.id
    const title = rawTitle || id, path = BookmarkManager_.iterPath_ + "/" + title
    if (bookmark.children) {
      bookmarkCache_.dirs_.push({ id_: id, path_: path, title_: title })
      const oldPath = BookmarkManager_.iterPath_
      if (2 < ++BookmarkManager_.iterDepth_) {
        BookmarkManager_.iterPath_ = path
      }
      bookmark.children.forEach(BookmarkManager_.traverseBookmark_, BookmarkManager_)
      --BookmarkManager_.iterDepth_
      BookmarkManager_.iterPath_ = oldPath
    } else {
      const url = bookmark.url!, jsScheme = "javascript:", isJS = url.startsWith(jsScheme)
      bookmarkCache_.bookmarks_.push({
        id_: id, path_: path, title_: title,
        t: isJS ? jsScheme : url,
        visible_: omniBlockList ? TestNotBlocked_(url, rawTitle) : kVisibility.visible,
        u: isJS ? jsScheme : url,
        jsUrl_: isJS ? url : null, jsText_: isJS ? BgUtils_.DecodeURLPart_(url) : null
      })
    }
  },
  Later_ (): void {
    const last = performance.now() - bookmarkCache_.stamp_
    if (bookmarkCache_.status_ !== BookmarkStatus.notInited) { return }
    if (last >= InnerConsts.bookmarkBasicDelay || last < -GlobalConsts.ToleranceOfNegativeTimeDelta) {
      BookmarkManager_._timer = bookmarkCache_.stamp_ = 0
      bookmarkCache_.expiredUrls_ = false
      BookmarkManager_.refresh_()
    } else {
      bookmarkCache_.bookmarks_ = []
      bookmarkCache_.dirs_ = []
      BookmarkManager_._timer = setTimeout(BookmarkManager_.Later_, InnerConsts.bookmarkFurtherDelay)
      MatchCacheManager_.clear_(MatchCacheType.bookmarks)
    }
  },
  Delay_ (): void {
    bookmarkCache_.stamp_ = performance.now()
    if (bookmarkCache_.status_ < BookmarkStatus.inited) { return }
    BookmarkManager_._timer = setTimeout(BookmarkManager_.Later_, InnerConsts.bookmarkBasicDelay)
    bookmarkCache_.status_ = BookmarkStatus.notInited
  },
  Expire_ (
      id: string, info?: chrome.bookmarks.BookmarkRemoveInfo | chrome.bookmarks.BookmarkChangeInfo): void {
    const arr = bookmarkCache_.bookmarks_, len = arr.length,
    title = info && (info as chrome.bookmarks.BookmarkChangeInfo).title
    let i = 0; for (; i < len && arr[i].id_ !== id; i++) { /* empty */ }
    if (i < len) {
      type WBookmark = Writable<Bookmark>
      const cur = arr[i] as WBookmark, url = cur.u,
      url2 = info && (info as chrome.bookmarks.BookmarkChangeInfo).url
      if (decodingEnabled && (title == null ? url !== cur.t || !info : url2 != null && url !== url2)) {
        urlDecodingDict_.has(url) && HistoryManager_.sorted_ && HistoryManager_.binarySearch_(url) < 0 &&
        urlDecodingDict_.delete(url)
      }
      if (title != null) {
        cur.path_ = cur.path_.slice(0, -cur.title_.length) + (title || cur.id_)
        cur.title_ = title || cur.id_
        if (url2) {
          cur.u = url2
          cur.t = UrlDecoder_.decodeURL_(url2, cur)
          UrlDecoder_.continueToWork_()
        }
        if (omniBlockList) {
          cur.visible_ = TestNotBlocked_(cur.u, cur.title_)
        }
      } else {
        arr.splice(i, 1)
        info || BookmarkManager_.Delay_(); // may need to re-add it in case of lacking info
      }
      return
    }
    if (!bookmarkCache_.dirs_.find(dir => dir.id_ === id)) { return } // "new" items which haven't been read are changed
    if (title != null) { /* a folder is renamed */ return BookmarkManager_.Delay_() }
    // a folder is removed
    if (!bookmarkCache_.expiredUrls_ && decodingEnabled) {
      const dict = urlDecodingDict_, bs = HistoryManager_.binarySearch_
      for (const { u: url } of (HistoryManager_.sorted_ ? arr : [])) {
        if (dict.has(url) && bs(url) < 0) {
          dict.delete(url)
        }
      }
      bookmarkCache_.expiredUrls_ = true
    }
    return BookmarkManager_.Delay_()
  }
}

set_findBookmark((wantFolder, titleOrPath: string) => {
  if (bookmarkCache_.status_ !== CompletersNS.BookmarkStatus.inited) {
    const defer = BgUtils_.deferPromise_<void>()
    BookmarkManager_.onLoad_ = defer.resolve_
    BookmarkManager_.refresh_()
    return defer.promise_.then(findBookmark.bind(0, wantFolder, titleOrPath))
  }
  const maybePath = titleOrPath.includes("/")
  const nodes = maybePath ? (titleOrPath + "").replace(<RegExpG & RegExpSearchable<0>> /\\\/?|\//g
      , s => s.length > 1 ? "/" : "\n").split("\n").filter(i => i) : []
  if (!titleOrPath || maybePath && !nodes.length) { return Promise.resolve(false) }
  const path2 = maybePath ? "/" + nodes.slice(1).join("/") : "", path1 = maybePath ? "/" + nodes[0] + path2 : ""
  for (const item of wantFolder ? [] : bookmarkCache_.bookmarks_) {
    if (maybePath && (item.path_ === path1 || item.path_ === path2) || item.title_ === titleOrPath) {
      return Promise.resolve(item)
    }
  }
  for (const item of wantFolder ? bookmarkCache_.dirs_ : []) {
    if (maybePath && (item.path_ === path1 || item.path_ === path2) || item.title_ === titleOrPath) {
      return Promise.resolve(item)
    }
  }
  let lastFound: CompletersNS.BaseBookmark | null = null
  for (const item of wantFolder ? [] : bookmarkCache_.bookmarks_) {
    if (item.title_.includes(titleOrPath)) {
      if (lastFound) { lastFound = null; break }
      lastFound = item
    }
  }
  return Promise.resolve(lastFound)
})

const finalUseHistory = (callback?: (() => void) | null): void => {
  if (callback) { callback() }
}

export const HistoryManager_ = {
  sorted_: false,
  loadingTimer_: 0,
  _callbacks: null as (() => void)[] | null,
  use_ (callback?: (() => void) | null): void {
    if (HistoryManager_._callbacks) { callback && HistoryManager_._callbacks.push(callback); return }
    historyCache_.lastRefresh_ = Date.now(); // safe for time changes
    if ((OnEdge || OnFirefox && Build.MayAndroidOnFirefox) && !browser_.history) {
      historyCache_.history_ = [], HistoryManager_.use_ = finalUseHistory
      finalUseHistory(callback)
      return
    }
    HistoryManager_._callbacks = callback ? [callback] : []
    if (HistoryManager_.loadingTimer_) { return }
    browser_.history.search({
      text: "",
      maxResults: InnerConsts.historyMaxSize,
      startTime: 0
    }, (history: chrome.history.HistoryItem[]): void => {
      setTimeout(HistoryManager_._Init!, 0, history)
    })
  },
  _Init: function (arr: Array<chrome.history.HistoryItem | HistoryItem>): void {
    HistoryManager_._Init = null
    for (let i = 0, len = arr.length; i < len; i++) {
      let j = arr[i] as chrome.history.HistoryItem, url = j.url
      if (url.length > GlobalConsts.MaxHistoryURLLength) {
        url = HistoryManager_.trimURLAndTitleWhenTooLong_(url, j)
      }
      (arr as HistoryItem[])[i] = {
        t: url,
        title_: OnChrome ? j.title! : j.title || "",
        time_: j.lastVisitTime,
        visible_: kVisibility.visible,
        u: url
      }
    }
    if (omniBlockList) {
      for (const k of arr as HistoryItem[]) {
        if (TestNotBlocked_(k.t, k.title_) === 0) {
          k.visible_ = kVisibility.hidden
        }
      }
    }
    setTimeout(function (): void {
      setTimeout(function (): void {
        const arr1 = historyCache_.history_!
        for (let i = arr1.length - 1; 0 < i; ) {
          const j = arr1[i], url = j.u, text = j.t = UrlDecoder_.decodeURL_(url, j),
          isSame = text.length >= url.length
          while (0 <= --i) {
            const k = arr1[i], url2 = k.u
            if (url2.length >= url.length || !url.startsWith(url2)) {
              break
            }
            (k as Writable<HistoryItem>).u = url.slice(0, url2.length)
            const decoded = isSame ? url2 : UrlDecoder_.decodeURL_(url2, k)
            // handle the case that j has been decoded in another charset but k hasn't
            k.t = isSame || decoded.length < url2.length ? text.slice(0, decoded.length) : decoded
          }
        }
        HistoryManager_.parseDomains_ && setTimeout((): void => {
          HistoryManager_.parseDomains_ && HistoryManager_.parseDomains_(historyCache_.history_!)
        }, 200)
      }, 100)
      historyCache_.history_!.sort((a, b) => a.u > b.u ? 1 : -1)
      HistoryManager_.sorted_ = true
      browser_.history.onVisitRemoved.addListener(HistoryManager_.OnVisitRemoved_)
      browser_.history.onVisited.addListener(HistoryManager_.OnPageVisited_)
    }, 100)
    historyCache_.history_ = arr as HistoryItem[], HistoryManager_.use_ = finalUseHistory
    HistoryManager_._callbacks && HistoryManager_._callbacks.length > 0 &&
    setTimeout(function (ref: (() => void)[]): void {
      for (const f of ref) {
        f()
      }
    }, 1, HistoryManager_._callbacks)
    HistoryManager_._callbacks = null
  } as ((arr: chrome.history.HistoryItem[]) => void) | null,
  OnPageVisited_ (newPage: chrome.history.HistoryItem): void {
    let url = newPage.url
    if (url.length > GlobalConsts.MaxHistoryURLLength) {
      url = HistoryManager_.trimURLAndTitleWhenTooLong_(url, newPage)
    }
    const time = newPage.lastVisitTime,
    title = OnChrome ? newPage.title! : newPage.title || "",
    updateCount = ++historyCache_.updateCount_,
    d = historyCache_.domains_, i = HistoryManager_.binarySearch_(url)
    if (i < 0) { historyCache_.toRefreshCount_++ }
    if (updateCount > 59
        || (updateCount > 10 && Date.now() - historyCache_.lastRefresh_ > 300000)) { // safe for time change
      HistoryManager_.refreshInfo_()
    }
    const j: HistoryItem = i >= 0 ? historyCache_.history_![i] : {
      t: "",
      title_: title,
      time_: time,
      visible_: omniBlockList ? As_<0 | kVisibility.visible>(TestNotBlocked_(url, title))
          : kVisibility.visible,
      u: url
    }
    let slot: Domain | undefined
    if (d) {
      let domain = parseDomainAndScheme_(url)
      if (!domain) { /* empty */ }
      else if (slot = d.get(domain.domain_)) {
        slot.time_ = time
        if (i < 0) { slot.count_ += j.visible_ }
        if (domain.scheme_ > Urls.SchemeId.HTTP - 1) { slot.https_ = domain.scheme_ === Urls.SchemeId.HTTPS ? 1 : 0 }
      } else {
        d.set(domain.domain_, {
          time_: time, count_: j.visible_, https_: domain.scheme_ === Urls.SchemeId.HTTPS ? 1 : 0
        })
      }
    }
    if (i >= 0) {
      j.time_ = time
      if (title && title !== j.title_) {
        j.title_ = title
        MatchCacheManager_.timer_ && MatchCacheManager_.clear_(MatchCacheType.history)
        if (omniBlockList) {
          const newVisible = TestNotBlocked_(url, title)
          if (j.visible_ !== newVisible) {
            j.visible_ = newVisible
            if (slot) {
              slot.count_ += newVisible || -1
            }
          }
        }
      }
      return
    }
    j.t = UrlDecoder_.decodeURL_(url, j)
    historyCache_.history_!.splice(~i, 0, j)
    MatchCacheManager_.timer_ && MatchCacheManager_.clear_(MatchCacheType.history)
  },
  OnVisitRemoved_ (toRemove: chrome.history.RemovedResult): void {
    decodingJobs.length = 0
    const d = urlDecodingDict_
    MatchCacheManager_.clear_(MatchCacheType.history)
    if (toRemove.allHistory) {
      historyCache_.history_ = []
      historyCache_.domains_ = new Map()
      const d2 = OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol ? new Set!<string>()
          : new Set!<string>(bookmarkCache_.bookmarks_.map(i => i.u))
      if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
        bookmarkCache_.bookmarks_.forEach(i => d2.add(i.u))
      }
      d.forEach((_, k): void => {
        d2.has(k) || d.delete(k)
      })
      return
    }
    const bs = HistoryManager_.binarySearch_
    const {history_: h, domains_: domains} = historyCache_
    let entry: Domain | undefined
    for (const j of toRemove.urls) {
      const i = bs(j)
      if (i >= 0) {
        if (domains && h![i].visible_) {
          const item = parseDomainAndScheme_(j)
          if (item && (entry = domains.get(item.domain_)) && (--entry.count_) <= 0) {
            domains.delete(item.domain_)
          }
        }
        h!.splice(i, 1)
        d.delete(j)
      }
    }
  },
  trimURLAndTitleWhenTooLong_ (url: string, history: chrome.history.HistoryItem | Tab): string {
    // should be idempotent
    const colon = url.lastIndexOf(":", 9), hasHost = colon > 0 && url.substr(colon, 3) === "://",
    title = history.title
    url = url.slice(0, (hasHost ? url.indexOf("/", colon + 4) : colon)
              + GlobalConsts.TrimmedURLPathLengthWhenURLIsTooLong) + "\u2026"
    if (title && title.length > GlobalConsts.TrimmedTitleLengthWhenURLIsTooLong) {
      history.title = BgUtils_.unicodeRSubstring_(title, 0, GlobalConsts.TrimmedTitleLengthWhenURLIsTooLong)
    }
    return url
  },
  refreshInfo_ (): void {
    type Q = chrome.history.HistoryQuery
    type C = (results: chrome.history.HistoryItem[]) => void
    const i = Date.now(); // safe for time change
    if (historyCache_.toRefreshCount_ <= 0) { /* empty */ }
    else if (i < historyCache_.lastRefresh_ + 1000 && i >= historyCache_.lastRefresh_) { return }
    else {
      setTimeout(browser_.history.search as ((q: Q, c: C) => void | 1) as (q: Q, c: C) => void, 50, {
        text: "",
        maxResults: Math.min(999, historyCache_.updateCount_ + 10),
        startTime: i < historyCache_.lastRefresh_ ? i - 5 * 60 * 1000 : historyCache_.lastRefresh_
      }, HistoryManager_.OnInfo_)
    }
    historyCache_.lastRefresh_ = i
    historyCache_.toRefreshCount_ = historyCache_.updateCount_ = 0
    return UrlDecoder_.continueToWork_()
  },
  parseDomains_: <((history: HistoryItem[]) => void) | null> ((history: HistoryItem[]): void => {
    HistoryManager_.parseDomains_ = null as never
    const d = historyCache_.domains_
    for (const { u: url, time_: time, visible_: visible } of history) {
      const item = parseDomainAndScheme_(url)
      if (!item) { continue }
      const {domain_: domain, scheme_: scheme} = item, slot = d.get(domain)
      if (slot) {
        if (slot.time_ < time) { slot.time_ = time }
        slot.count_ += visible
        if (scheme > Urls.SchemeId.HTTP - 1) { slot.https_ = scheme === Urls.SchemeId.HTTPS ? 1 : 0 }
      } else {
        d.set(domain, {time_: time, count_: visible, https_: scheme === Urls.SchemeId.HTTPS ? 1 : 0})
      }
    }
  }),
  OnInfo_ (history: chrome.history.HistoryItem[]): void {
    const arr = historyCache_.history_!, bs = HistoryManager_.binarySearch_
    if (arr.length <= 0) { return }
    for (const info of history) {
      let url = info.url
      if (url.length > GlobalConsts.MaxHistoryURLLength) {
        info.url = url = HistoryManager_.trimURLAndTitleWhenTooLong_(url, info)
      }
      const j = bs(url)
      if (j < 0) {
        historyCache_.toRefreshCount_--
      } else {
        const item = arr[j], title = info.title
        if (!title || title === item.title_) {
          continue
        }
      }
      historyCache_.updateCount_--
      HistoryManager_.OnPageVisited_(info)
    }
  },
  binarySearch_ (u: string): number {
    let e = "", a = historyCache_.history_!, h = a.length - 1, l = 0, m = 0
    while (l <= h) {
      m = (l + h) >>> 1
      e = a[m].u
      if (e > u) { h = m - 1 }
      else if (e !== u) { l = m + 1 }
      else { return m }
    }
    // if e > u, then l == h + 1 && l == m
    // else if e < u, then l == h + 1 && l == m + 1
    // (e < u ? -2 : -1) - m = (e < u ? -1 - 1 - m : -1 - m) = (e < u ? -1 - l : -1 - l)
    // = -1 - l = ~l
    return ~l
  }
}

export const getRecentSessions_ = (expected: number, showBlocked: boolean
    , callback: (list: BrowserUrlItem[]) => void): void => {
  const browserSession = !OnEdge ? browserSessions_() : null
  if (!browserSession) { callback([]); return }
  // the timer is for https://github.com/gdh1995/vimium-c/issues/365#issuecomment-1003652820
  let timer = OnFirefox ? setTimeout((): void => { timer = 0; callback([]) }, 150) : 0
  // Some browsers may return more session items when no `maxResults` but still require `maxResults <= 25` if it exists,
  // as reported in https://github.com/gdh1995/vimium-c/issues/553#issuecomment-1035063582
  browserSession.getRecentlyClosed({
    maxResults: Math.min(Math.round(expected * 1.2), +browserSession.MAX_SESSION_RESULTS || 25, 25)
  }, (sessions?: chrome.sessions.Session[]): void => {
    // Note: sessions may be undefined, see log in https://github.com/gdh1995/vimium-c/issues/437#issuecomment-921878143
    if (OnFirefox) {
      if (!timer) { return }
      clearTimeout(timer)
    }
    let arr2: BrowserUrlItem[] = [], t: number, anyWindow: BOOL = 0
    for (const item of sessions || []) {
      const entry = item.tab
      if (!entry) { anyWindow = 1; continue }
      let url = entry.url
      if (url.length > GlobalConsts.MaxHistoryURLLength) {
        url = HistoryManager_.trimURLAndTitleWhenTooLong_(url, entry)
      }
      const title = entry.title
      if (!showBlocked && !TestNotBlocked_(url, title)) { continue }
      arr2.push({
        u: url, title_: title,
        visit_: OnFirefox ? item.lastModified
            : (t = item.lastModified, t < /* as ms: 1979-07 */ 3e11 && t > /* as ms: 1968-09 */ -4e10 ? t * 1000 : t),
        sessionId_: [entry.windowId, entry.sessionId!]
      })
    }
    if (anyWindow) { // for GC
      setTimeout(callback, 0, arr2)
    } else {
      callback(arr2)
    }
    return runtimeError_()
  })
}

export const TestNotBlocked_ = (url: string, title: string): CompletersNS.Visibility => {
  return omniBlockListRe!.test(title) || omniBlockListRe!.test(url)
      ? kVisibility.hidden : kVisibility.visible
}

export const BlockListFilter_ = {
  IsExpectingHidden_ (query: string[]): boolean {
    if (omniBlockList) {
      for (const word of query) {
        for (let phrase of omniBlockList) {
          phrase = phrase.trim()
          if (word.includes(phrase) || phrase.length > 9 && word.length + 2 >= phrase.length
              && phrase.includes(word)) {
            return true
          }
        }
      }
    }
    return false
  },
  UpdateAll_ (): void {
    if (bookmarkCache_.bookmarks_) {
      for (const k of bookmarkCache_.bookmarks_) {
        (k as Writable<Bookmark>).visible_ = omniBlockList ? TestNotBlocked_(k.t, k.path_)
          : kVisibility.visible
      }
    }
    if (!historyCache_.history_) {
      return
    }
    const d = historyCache_.domains_
    for (const k of historyCache_.history_) {
      const newVisible = omniBlockList ? TestNotBlocked_(k.t, k.title_) : kVisibility.visible
      if (k.visible_ !== newVisible) {
        k.visible_ = newVisible
        if (d) {
          const domain = parseDomainAndScheme_(k.u)
          if (domain) {
            const slot = d.get(domain.domain_)
            if (slot) {
              slot.count_ += newVisible || -1
            }
          }
        }
      }
    }
  }
}

export const UrlDecoder_ = {
  decodeURL_ (a: string, o: ItemToDecode): string {
    if (a.length >= 400 || a.lastIndexOf("%") < 0) { return a }
    try {
      return _decodeFunc(a)
    } catch {}
    return urlDecodingDict_.get(a) || (o && decodingJobs.push(o), a)
  },
  decodeList_ (a: DecodedItem[]): void {
    const dict = urlDecodingDict_, jobs = decodingJobs
    let i = -1, j: DecodedItem | undefined, l = a.length, s: string | undefined
    for (; ; ) {
      try {
        while (++i < l) {
          j = a[i]; s = j.u
          j.t = s.length >= 400 || s.lastIndexOf("%") < 0 ? s : _decodeFunc(s)
        }
        break
      } catch {
        j!.t = dict.get(s!) || (jobs.push(j!), s!)
      }
    }
    UrlDecoder_.continueToWork_()
  },
  continueToWork_ (): void {
    if (decodingJobs.length === 0 || decodingIndex !== -1) { return }
    decodingIndex = 0;
    (setTimeout as (handler: () => void, timeout: number) => number)(/*#__NOINLINE__*/ doDecoding_, 17)
  }
}

const doDecoding_ = (xhr?: TextXHR | null): void => {
  let text: string | undefined, end = decodingJobs.length
  if (!dataUrlToDecode_ || decodingIndex >= end) {
    decodingJobs.length = 0, decodingIndex = -1
    if (WithTextDecoder) {
      charsetDecoder_ = null
    }
    return
  }
  if (WithTextDecoder) {
    end = Math.min(decodingIndex + 32, end)
    charsetDecoder_ = charsetDecoder_ || new TextDecoder(dataUrlToDecode_)
  }
  for (; decodingIndex < end; decodingIndex++) {
    const url = decodingJobs[decodingIndex], isStr = typeof url === "string",
    str = isStr ? url : url.u
    if (text = urlDecodingDict_.get(str)) {
      isStr || (url.t = text)
      continue
    }
    if (!WithTextDecoder) {
      xhr || (xhr = /*#__NOINLINE__*/ createXhr_())
      xhr.open("GET", dataUrlToDecode_ + str, true)
      xhr.send()
      return
    }
    text = str.replace(<RegExpG & RegExpSearchable<0>> /%[a-f\d]{2}(?:%[a-f\d]{2})+/gi, doDecodePart_)
    text = text.length !== str.length ? text : str
    if (typeof url !== "string") {
      urlDecodingDict_.set(url.u, url.t = text)
    } else {
      urlDecodingDict_.set(url, text)
    }
  }
  if (WithTextDecoder) {
    if (decodingIndex < decodingJobs.length) {
      (setTimeout as (handler: (arg?: undefined) => void, timeout: number) => number)(doDecoding_, 4)
    } else {
      decodingJobs.length = 0
      decodingIndex = -1
      charsetDecoder_ = null
    }
  }
}

const doDecodePart_ = (text: string): string => {
  const arr = new Uint8Array(text.length / 3)
  for (let i = 1, j = 0; i < text.length; i += 3) {
    arr[j++] = parseInt(text.substr(i, 2), 16)
  }
  return charsetDecoder_!.decode(arr)
}

const createXhr_ = (): TextXHR => {
  const xhr = new XMLHttpRequest() as TextXHR
  xhr.responseType = "text"
  xhr.onload = function (): void {
    if (decodingIndex < 0) { return } // disabled by the outsides
    const url = decodingJobs[decodingIndex++]
    const text = this.responseText
    if (typeof url !== "string") {
      urlDecodingDict_.set(url.u, url.t = text)
    } else {
      urlDecodingDict_.set(url, text)
    }
    if (decodingIndex < decodingJobs.length) {
      doDecoding_(xhr)
    } else {
      decodingJobs.length = 0
      decodingIndex = -1
    }
  }
  return xhr
}

/** @see {@link ../pages/options_ext.ts#isExpectingHidden_} */
updateHooks_.omniBlockList = function (newList: string): void {
  const arr: string[] = []
  for (let line of newList.split("\n")) {
    if (line.trim() && line[0] !== "#") {
      arr.push(line)
    }
  }
  omniBlockListRe = arr.length > 0 ? new RegExp(arr.map(BgUtils_.escapeAllForRe_).join("|"), "") : null
  omniBlockList = arr.length > 0 ? arr : null;
  (historyCache_.history_ || bookmarkCache_.bookmarks_.length) && setTimeout(BlockListFilter_.UpdateAll_, 100)
}
void settings_.ready_.then((): void => { settings_.postUpdate_("omniBlockList") })

if (!OnChrome || Build.MinCVer >= BrowserVer.MinRequestDataURLOnBackgroundPage
    || WithTextDecoder || CurCVer_ > BrowserVer.MinRequestDataURLOnBackgroundPage - 1) {
  updateHooks_.localeEncoding = (charset: string): void => {
    let enabled = charset ? !(charset = charset.toLowerCase()).startsWith("utf") : false
    const oldUrl = dataUrlToDecode_
    if (WithTextDecoder) {
      dataUrlToDecode_ = enabled ? charset : ""
      if (dataUrlToDecode_ === oldUrl) { return }
      try { new TextDecoder(dataUrlToDecode_) }
      catch { enabled = false }
    } else {
      const newDataUrl = enabled ? "data:text/plain;charset=" + charset + "," : ""
      if (newDataUrl === oldUrl) { return }
      dataUrlToDecode_ = newDataUrl
    }
    if (enabled) {
      oldUrl !== "1" && /* inited */ setTimeout(function (): void {
        if (historyCache_.history_) {
          UrlDecoder_.decodeList_(historyCache_.history_)
        }
        return UrlDecoder_.decodeList_(bookmarkCache_.bookmarks_)
      }, 100)
    } else {
      urlDecodingDict_.clear()
      decodingJobs && (decodingJobs.length = 0)
    }
    if (decodingEnabled === enabled) { return }
    decodingJobs = enabled ? [] as ItemToDecode[] : { length: 0, push: blank_ } as any
    decodingEnabled = enabled
    decodingIndex = -1
  }
  settings_.postUpdate_("localeEncoding")
} else {
  decodingJobs = { length: 0, push: blank_ } as any[]
}

Completion_.removeSug_ = (url, type: FgReq[kFgReq.removeSug]["t"], callback: (succeed: boolean) => void): void => {
  switch (type) {
  case "tab":
    MatchCacheManager_.cacheTabs_(null)
    Tabs_.remove(+url, (): void => {
      const err = runtimeError_()
      err || MatchCacheManager_.cacheTabs_(null)
      callback(!<boolean> <boolean | void> err)
      return err
    })
    break
  case "history":
    const found = !HistoryManager_.sorted_ || HistoryManager_.binarySearch_(url as string) >= 0
    browser_.history.deleteUrl({ url: url as string })
    found && MatchCacheManager_.clear_(MatchCacheType.history)
    callback(found)
    break
  }
}

Completion_.isExpectingHidden_ = BlockListFilter_.IsExpectingHidden_

if (!Build.NDEBUG) {
  Object.assign(globalThis as any, { BookmarkManager_, HistoryManager_, BlockListFilter_, UrlDecoder_ })
}
