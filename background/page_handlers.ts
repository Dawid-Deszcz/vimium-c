import {
  contentPayload_, evalVimiumUrl_, keyFSM_, keyToCommandMap_, mappedKeyRegistry_, newTabUrls_, restoreSettings_,
  CONST_, settingsCache_, shownHash_, substitute_, framesForTab_, curTabId_, extAllowList_, OnChrome, reqH_, OnEdge,
  storageCache_, os_, framesForOmni_, updateHooks_
} from "./store"
import { deferPromise_, protocolRe_, safeObj_ } from "./utils"
import { browser_, getCurTab, getTabUrl, Q_, runContentScriptsOn_, runtimeError_ } from "./browser"
import { convertToUrl_, lastUrlType_, reformatURL_ } from "./normalize_urls"
import { findUrlInText_, parseSearchEngines_ } from "./parse_urls"
import * as settings_ from "./settings"
import { indexFrame } from "./ports"
import * as Exclusions from "./exclusions"
import { MergeAction, mergeCSS, reloadCSS_ } from "./ui_css"
import { keyMappingErrors_ } from "./key_mappings"
import { runNextOnTabLoaded } from "./run_commands"
import { MediaWatcher_ } from "./tools"
import { checkHarmfulUrl_, focusOrLaunch_ } from "./open_urls"
import { initHelp } from "./frame_commands"
import { kPgReq, PgReq, Req2 } from "./page_messages"

import PagePort = Frames.PagePort
type OrPromise<T> = T | Promise<T>

const pageRequestHandlers_ = As_<{
  readonly [K in keyof PgReq]:
      PgReq[K][0] extends null | void ? (_: void | null, port: PagePort | null) => OrPromise<PgReq[K][1]>
      : (request: PgReq[K][0], port: PagePort | null) => OrPromise<PgReq[K][1] extends void | null ? void : PgReq[K][1]>
}>([
  /** kPgReq.settingsDefaults: */ (_): PgReq[kPgReq.settingsDefaults][1] =>
      [settings_.defaults_, Build.OS & (Build.OS - 1) || Build.OS > 7 ? os_ : (Build.OS / 2) | 0, CONST_.Platform_],
  /** kPgReq.settingsCache: */ (req): OrPromise<PgReq[kPgReq.settingsCache][1]> => {
    if (restoreSettings_) {
      return restoreSettings_.then(pageRequestHandlers_[kPgReq.settingsCache].bind(null, req, null))
    }
    const cache = {} as SettingsNS.SettingsWithDefaults
    for (const key in settings_.defaults_) {
      const val = settingsCache_[key as keyof SettingsNS.SettingsWithDefaults]
      if (val !== settings_.defaults_[key as keyof SettingsNS.SettingsWithDefaults]) {
        cache[key as keyof SettingsNS.SettingsWithDefaults] = val as never
      }
    }
    return cache
  },
  /** kPgReq.setSetting: */ (req): OrPromise<PgReq[kPgReq.setSetting][1]> => {
    if (restoreSettings_) {
      return restoreSettings_.then(pageRequestHandlers_[kPgReq.setSetting].bind(null, req, null))
    }
    // in fact, allow unknown key
    const key = req.key, val = req.val ?? settings_.defaults_[key] ?? null
    settings_.set_(key, val)
    const val2 = settingsCache_[key]!
    return val2 !== val ? val2 : null
  },
  /** kPgReq.updatePayload: */ (req): PgReq[kPgReq.updatePayload][1] => {
    const val2 = settings_.updatePayload_(req.key, req.val)
    return val2 !== req.val ? val2 : null
  },
  /** kPgReq.notifyUpdate: */ (req): void => {
    settings_.broadcast_({ N: kBgReq.settingsUpdate, d: req })
  },
  /** kPgReq.settingItem: */ (req): PgReq[kPgReq.settingItem][1] => settingsCache_[req.key],
  /** kPgReq.runJSOn: */ (id): PgReq[kPgReq.runJSOn][1] => { framesForTab_.has(id) || runContentScriptsOn_(id) },
  /** kPgReq.keyMappingErrors: */ (): PgReq[kPgReq.keyMappingErrors][1] => {
    const formatCmdErrors_ = (errors: string[][]): string => {
      let i: number, line: string[], output = errors.length > 1 ? errors.length + " Errors:\n" : "Error: "
      for (line of errors) {
        i = 0
        output += line[0].replace(<RegExpG & RegExpSearchable<1>>/%([a-z])/g, (_, s: string): string => {
          ++i
          return s === "c" ? "" : s === "s" || s === "d" ? line[i] : JSON.stringify(line[i])
        })
        if (i + 1 < line.length) {
          output += " " + (line.slice(i + 1).map(x => typeof x === "object" && x ? JSON.stringify(x) : x).join(" "))
        }
        output += ".\n"
      }
      return output
    }
    const errors = keyMappingErrors_
    if (contentPayload_.l & kKeyLayout.alwaysIgnore && !errors) {
      const nonASCII = (arr: string[]): boolean => (<RegExpOne> /[^ -\xff]/).test(arr.join(""))
      let res = nonASCII(Object.keys(keyFSM_)) ? 1 : 0
      res |= mappedKeyRegistry_ && nonASCII(Object.keys(mappedKeyRegistry_)) ? 2 : 0
      if (res) {
        res |= !(res & 2) && mappedKeyRegistry_ && nonASCII(Object.values(mappedKeyRegistry_) as string[]) ? 4 : 0
        if ((res & 2) || !(res & 4)) {
          return true
        }
      }
    }
    return errors ? formatCmdErrors_(errors) : ""
  },
  /** kPgReq.parseCSS: */ (req): PgReq[kPgReq.parseCSS][1] => {
    const port = indexFrame(req[1], 0) as Frames.Port | null
    if (port && port.s) {
      port.s.flags_ |= Frames.Flags.hasCSS | Frames.Flags.userActed | Frames.Flags.hasFindCSS
    }
    return mergeCSS(req[0], MergeAction.virtual)!
  },
  /** kPgReq.reloadCSS: */ (req): PgReq[kPgReq.reloadCSS][1] => {
    req && settings_.setInLocal_(GlobalConsts.kIsHighContrast, req.hc ? "1" : null)
    reloadCSS_(MergeAction.rebuildAndBroadcast)
  },
  /** kPgReq.convertToUrl: */ (req): PgReq[kPgReq.convertToUrl][1] => {
    const url = convertToUrl_(req[0], null, req[1])
    return [url, lastUrlType_]
  },
  /** kPgReq.updateMediaQueries: */ (): PgReq[kPgReq.updateMediaQueries][1] => {
    Build.MV3 || MediaWatcher_.RefreshAll_()
  },
  /** kPgReq.whatsHelp: */ (): PgReq[kPgReq.whatsHelp][1] => {
    const cmdRegistry = keyToCommandMap_.get("?")
    let matched = "?"
    if (!cmdRegistry || cmdRegistry.alias_ !== kBgCmd.showHelp || !cmdRegistry.background_) {
      keyToCommandMap_.forEach((item, key): void => {
        if (item.alias_ === kBgCmd.showHelp && item.background_) {
          matched = matched && matched.length < key.length ? matched : key;
        }
      })
    }
    return matched
  },
  /** kPgReq.checkNewTabUrl: */ (url): PgReq[kPgReq.checkNewTabUrl][1] => {
    url = convertToUrl_(url, null, Urls.WorkType.Default)
    return [ url, newTabUrls_.get(url) ?? null ]
  },
  /** kPgReq.checkSearchUrl: */ (str): PgReq[kPgReq.checkSearchUrl][1] => {
    const map = new Map<string, Search.RawEngine>()
    parseSearchEngines_("k:" + str, map)
    const obj = map.get("k")
    if (obj == null) {
      return null
    }
    const url2 = convertToUrl_(obj.url_, null, Urls.WorkType.KeepAll)
    const fail = lastUrlType_ > Urls.Type.MaxOfInputIsPlainUrl
    return [!fail, fail ? obj.url_ : url2.replace(<RegExpG> /\s+/g, "%20")
        + (obj.name_ && obj.name_ !== "k" ? " " + obj.name_ : "") ]
  },
  /** kPgReq.focusOrLaunch: */ (req): PgReq[kPgReq.focusOrLaunch][1] => { focusOrLaunch_(req) },
  /** kPgReq.showUrl: */ (url): OrPromise<PgReq[kPgReq.showUrl][1]> => {
    let str1: Urls.Url | null = null
    if (url.startsWith("vimium://")) {
      str1 = evalVimiumUrl_(url.slice(9), Urls.WorkType.ActIfNoSideEffects, true)
    }
    str1 = str1 !== null ? str1 : convertToUrl_(url, null, Urls.WorkType.ConvertKnown)
    if (typeof str1 === "string") {
      str1 = findUrlInText_(str1, "whole")
      str1 = reformatURL_(str1)
    }
    return str1
  },
  /** kPgReq.shownHash: */ (): PgReq[kPgReq.shownHash][1] => shownHash_ && shownHash_(),
  /** kPgReq.substitute: */ (req): PgReq[kPgReq.substitute][1] => substitute_(req[0], req[1]),
  /** kPgReq.checkHarmfulUrl: */ (url): PgReq[kPgReq.checkHarmfulUrl][1] => checkHarmfulUrl_(url),
  /** kPgReq.popupInit: */ (): Promise<PgReq[kPgReq.popupInit][1]> => {
    return Promise.all([Q_(getCurTab), restoreSettings_]).then(([_tabs]): PgReq[kPgReq.popupInit][1] => {
      const tab = _tabs && _tabs[0] || null, tabId = tab ? tab.id : curTabId_
      const ref = framesForTab_.get(tabId) ?? null
      const url = tab ? getTabUrl(tab) : ref && (ref.top_ || ref.cur_).s.url_ || ""
      const sender = ref && (!ref.cur_.s.frameId_ || protocolRe_.test(ref.cur_.s.url_)) ? ref.cur_.s : null
      const notRunnable = !(ref || tab && url && tab.status === "loading" && (<RegExpOne> /^(ht|s?f)tp/).test(url))
      const unknownExt = getUnknownExt(ref)
      const runnable = !notRunnable && !unknownExt
      let extHost = runnable ? null : unknownExt || !url ? unknownExt
          : (url.startsWith(location.protocol) && !url.startsWith(location.origin + "/") ? new URL(url).host : null)
      const extStat = extHost ? extAllowList_.get(extHost) : null
      const mayAllow = !runnable && (extStat != null && extStat !== true)
      if (mayAllow) {
        ref && (ref.unknownExt_ = -1)
        if (!OnChrome) {
          let maybeId = extAllowList_.get(extHost!)
          extHost = typeof maybeId === "string" && maybeId ? maybeId : extHost
        }
      } else {
        extHost = null
      }
      return { ver: CONST_.VerName_, runnable, url, tabId,
        frameId: ref && (sender || ref.top_) ? (sender || ref.top_!.s).frameId_ : 0,
        topUrl: sender && sender.frameId_ && ref!.top_ ? ref!.top_.s.url_ : null, frameUrl: sender && sender.url_,
        lock: ref && ref.lock_ ? ref.lock_.status_ : null, status: sender ? sender.status_ : Frames.Status.enabled,
        unknownExt: extHost,
        exclusions: runnable ? {
          rules: settingsCache_.exclusionRules, onlyFirst: settingsCache_.exclusionOnlyFirstMatch,
          matchers: Exclusions.parseMatcher_(null), defaults: settings_.defaults_.exclusionRules
        } : null,
        os: Build.OS & (Build.OS - 1) || Build.OS > 7 ? os_ : (Build.OS / 2) | 0, reduceMotion: contentPayload_.m
      }
    })
  },
  /** kPgReq.allowExt: */ ([tabId, extIdToAdd]): Promise<PgReq[kPgReq.allowExt][1]> => {
    let list = settingsCache_.extAllowList, old = list.split("\n")
    if (old.indexOf(extIdToAdd) < 0) {
      const ind = old.indexOf("# " + extIdToAdd) + 1 || old.indexOf("#" + extIdToAdd) + 1
      old.splice(ind ? ind - 1 : old.length, ind ? 1 : 0, extIdToAdd)
      list = old.join("\n")
      settings_.set_("extAllowList", list)
    }
    const frames = framesForTab_.get(tabId)
    frames && (frames.unknownExt_ = null)
    return Q_(browser_.tabs.get, tabId).then((tab): Promise<void> => {
      const q = deferPromise_<void>()
      const cb = (): void => {
        runNextOnTabLoaded({}, tab, q.resolve_)
        return browser_.runtime.lastError
      }
      tab ? browser_.tabs.reload(tab.id, cb) : browser_.tabs.reload(cb)
      return q.promise_
    })
  },
  /** kPgReq.toggleStatus: */ ([url, tabId, frameId]): PgReq[kPgReq.toggleStatus][1] => {
    evalVimiumUrl_("status/" + url, Urls.WorkType.EvenAffectStatus) as Urls.StatusEvalResult
    const port = indexFrame(tabId, frameId) || indexFrame(tabId, 0)
    const lock = port ? framesForTab_.get(tabId)!.lock_ : null
    if (port && !lock) {
      reqH_[kFgReq.checkIfEnabled]({ u: port.s.url_ }, port)
    }
    return [port ? port.s.status_ : Frames.Status.enabled, lock ? lock.status_ : null]
  },
  /** kPgReq.parseMatcher: */ (pattern): PgReq[kPgReq.parseMatcher][1] => {
    return Exclusions.parseMatcher_(pattern)[0]
  },
  /** kPgReq.initHelp: */ (_, port): Promise<PgReq[kPgReq.initHelp][1]> => initHelp({ f: true }, port as Port),
  /** kPgReq.callApi: */ (req): OrPromise<PgReq[kPgReq.callApi][1]> => {
    const mName = req.module as "permissions", fName = req.name as "contains", validFuncs = validApis[mName]
    if (!validApis.hasOwnProperty(mName) || !validFuncs!.includes(fName)) {
      return [void 0, { message: "refused" }]
    }
    const module = browser_[mName], arr = req.args
    const func = module[fName] as (args: unknown[]) => void | Promise<unknown>
    if (!OnChrome) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return (func.apply(module, arr as any) as Promise<unknown>).then<ExtApiResult<unknown>, ExtApiResult<unknown>>(
          i => [i, void 0], err => [void 0, parseErr(err)])
    }
    return new Promise<ExtApiResult<unknown>>((resolve): void => {
      arr.push((res: unknown): void => {
        const err = runtimeError_()
        resolve(err ? [void 0, err as { message?: unknown }] : [parseErr(res), void 0])
        return err as void
      })
      void func.apply(module, arr as any) // eslint-disable-line @typescript-eslint/no-unsafe-argument
    })
  },
  /** kPgReq.selfTabId: */ (_, port): number => (port!.s as Extract<NonNullable<typeof port>["s"], object>).tabId_,
  /** kPgReq.getStorage: */ (req): PgReq[kPgReq.getStorage][1] => {
    let dict: Dict<string | null> = safeObj_()
    if (req) {
      const val = storageCache_.get(req)
      dict[req] = val != null ? val : null
    } else {
      storageCache_.forEach((val: string, key: SettingsNS.LocalSettingNames): void => { dict[key] = val })
    }
    return dict
  },
  /** kPgReq.setInLocal: */ ({ key, val }): void => {
    if (!key.includes("|")) { return }
    settings_.setInLocal_(key as `${string}|${string}`, val)
  },
  /** kPgReq.updateOmniPayload: */ ({ key, val }, port): void => {
    const tabId = port && port.s && port.s.tabId_ || curTabId_
    const omniPort = framesForOmni_.find(i => i.s.tabId_ === tabId)
    omniPort && omniPort.postMessage({ N: kBgReq.omni_updateOptions, d: { [key]: val } })
  },
  /** kPgReq.saveToSyncAtOnce: */ (): void => {
    settingsCache_.vimSync && updateHooks_.vimSync!(true, "vimSync")
  }
])

type _FuncKeys<K, T> = K extends keyof T ? T[K] extends Function
    ? K extends `${string}_${string}` ? never : K : never : never
type FuncKeys<T> = _FuncKeys<keyof T, T>
const validApis: { [T in keyof typeof chrome]?: FuncKeys<typeof chrome[T]>[] } = OnEdge ? {} : {
  permissions: ["contains", "request", "remove"],
  tabs: ["update"]
}

const parseErr = (err: any): NonNullable<ExtApiResult<0>[1]> => {
  return { message: (err && err.message ? err.message as AllowToString + "" : JSON.stringify(err)) }
}

export const onReq = (<K extends keyof PgReq> (req: Req2.pgReq<K>, port: PagePort | null): OrPromise<Req2.pgRes> => {
  type ReqK = keyof PgReq;
  return (pageRequestHandlers_ as {
    [T2 in keyof PgReq]: (req: Req2.OrNull<PgReq[T2][0]>, port: PagePort | null) => OrPromise<PgReq[T2][1]>
  } as {
    [T2 in keyof PgReq]: <T3 extends ReqK>(r: Req2.OrNull<PgReq[T3][0]>, p: PagePort | null) => OrPromise<PgReq[T3][1]>
  })[req.n](req.q, port)
}) as (req: unknown, port: PagePort | null) => OrPromise<Req2.pgRes>

const getUnknownExt = (frames?: Frames.Frames | null): string | null => {
  return !!frames && typeof frames.unknownExt_ === "string" && extAllowList_.get(frames.unknownExt_) !== true
      ? frames.unknownExt_ : null
}
