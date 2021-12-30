export declare const enum kPgReq {
   /** 0..4 */ settingsDefaults, settingsCache, setSetting, updatePayload, notifyUpdate,
   /** 5..9 */ settingItem, runJSOn, keyMappingErrors, parseCSS, reloadCSS,
   /** 10..14 */ convertToUrl, updateMediaQueries, whatsHelp, checkNewTabUrl, checkSearchUrl,
   /** 15..19 */ focusOrLaunch, showUrl, shownHash, substitute, checkHarmfulUrl,
   /** 20..24 */ popupInit, allowExt, toggleStatus, parseMatcher, initHelp,
   /** 25..27 */ callApi, selfTabId, getStorage,
  __mask = ""
}

interface KVPair<T extends object, K extends keyof T = keyof T> { key: K, val: T[K] }
type Values<T extends object, K extends keyof T = keyof T> = T[K]

export interface PgReq {
  [kPgReq.settingsDefaults]: [ void, [conf: SettingsNS.SettingsWithDefaults, os: kOS, platform: string] ]
  [kPgReq.settingsCache]: [ void, SettingsNS.SettingsWithDefaults ]
  [kPgReq.setSetting]: [ KVPair<SettingsNS.PersistentSettings>, Values<SettingsNS.PersistentSettings> | null ]
  [kPgReq.updatePayload]: [
    { key: keyof SettingsNS.FrontendSettingsSyncingItems,
      val: Values<SettingsNS.FrontendSettings> | /** autoDarkMode */ boolean },
    SettingsNS.FrontendSettingCache[keyof SettingsNS.FrontendSettingsSyncingItems] | null
  ]
  [kPgReq.notifyUpdate]: [ (keyof SettingsNS.FrontendSettingsSyncingItems)[], void ]
  [kPgReq.settingItem]: [ { key: keyof SettingsNS.SettingsWithDefaults }, Values<SettingsNS.SettingsWithDefaults> ]
  [kPgReq.runJSOn]: [ number, void ]
  [kPgReq.keyMappingErrors]: [ void, true | string ]
  [kPgReq.parseCSS]: [ [string, number], SettingsNS.MergedCustomCSS ]
  [kPgReq.reloadCSS]: [ { hc: boolean } | null, void ]
  [kPgReq.convertToUrl]: [ [string, Urls.WorkEnsureString], [string, Urls.Type] ]
  [kPgReq.updateMediaQueries]: [ void, void ]
  [kPgReq.whatsHelp]: [ void, string ]
  [kPgReq.checkNewTabUrl]: [ string, [string, Urls.NewTabType | null] ]
  [kPgReq.checkSearchUrl]: [ string, [ok: boolean, url: string] | null ]
  [kPgReq.focusOrLaunch]: [ FgReq[kFgReq.focusOrLaunch], void ]
  [kPgReq.showUrl]: [ string, Urls.Url ]
  [kPgReq.shownHash]: [ void, string | null ]
  [kPgReq.substitute]: [ [string, SedContext], string ]
  [kPgReq.checkHarmfulUrl]: [ string, boolean ]
  [kPgReq.popupInit]: [ void, { ver: string, runnable: boolean, url: string, tabId: number, frameId: number,
    topUrl: string | null, frameUrl: string | null, lock: Frames.ValidStatus | null, status: Frames.ValidStatus,
    unknownExt: string | null,
    exclusions: {
      rules: SettingsNS.SettingsWithDefaults["exclusionRules"], onlyFirst: boolean, matchers: BaseUrlMatcher[],
      defaults: SettingsNS.SettingsWithDefaults["exclusionRules"]
    } | null
    os: kOS, reduceMotion: boolean
  } ]
  [kPgReq.allowExt]: [ [ tabId: number, extIdToAdd: string], void ]
  [kPgReq.toggleStatus]: [ [cmd: string, tab: number, frame: number], [ Frames.ValidStatus, Frames.ValidStatus | null] ]
  [kPgReq.parseMatcher]: [ string, BaseUrlMatcher ]
  [kPgReq.initHelp]: [ void, void ]
  [kPgReq.callApi]: [ {
    module: "permissions", name: "contains" | "request" | "remove", args: unknown[]
  } | {
    module: "tabs", name: "update", args: Parameters<typeof chrome.tabs.update>
  }, ExtApiResult<unknown> ]
  [kPgReq.selfTabId]: [ void, number ]
  [kPgReq.getStorage]: [ GlobalConsts.kIsHighContrast | null, Dict<unknown> ]
}

export declare namespace Req2 {
  type OrNull<K> = K extends void | undefined ? null : K
  interface pgReq<K extends keyof PgReq> {
    /** name */ n: K
    /** query body */ q: OrNull<PgReq[K][0]>
  }
  type pgRes = PgReq[keyof PgReq][1]
}
