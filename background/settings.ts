import SettingsWithDefaults = SettingsNS.SettingsWithDefaults;
type WritableSettingsCache = SettingsNS.FullCache;
type SettingsUpdateMsg = {
  [K in keyof Req.bg<kBgReq.settingsUpdate>]: K extends "d"
      ? Array<keyof SettingsNS.FrontendSettingsSyncingItems> | SettingsNS.FrontendSettingCache
      : Req.bg<kBgReq.settingsUpdate>[K]
}

const As_ = <T> (i: T): T => i;
// eslint-disable-next-line no-var
var Settings_ = {
  cache_: BgUtils_.safeObj_() as Readonly<SettingsNS.FullCache>,
  temp_: {
    hasEmptyLocalStorage_: localStorage.length <= 0,
    backupSettingsToLocal_: null as null | ((wait: number) => void) | true,
    onInstall_: null as Parameters<chrome.runtime.RuntimeInstalledEvent["addListener"]>[0] | null,
    initing_: BackendHandlersNS.kInitStat.START,
    cmdErrors_: 0,
    newSettingsToBroadcast_: null as Extract<SettingsUpdateMsg["d"], string[]> | null,
    IconBuffer_: null as IconNS.AccessIconBuffer | null,
    loadI18nPayload_: null as (() => void) | null,
    omniStyleOverridden_: false,
    shownHash_: null as ((this: void) => string) | null
  },
  payload_: <SettingsNS.FrontendSettingCache> As_<SettingsNS.DeclaredFrontendValues>({
    v: Build.BTypes & BrowserType.Chrome ? CurCVer_ : Build.BTypes & BrowserType.Firefox ? CurFFVer_ : 0,
    d: "",
    m: false,
    g: false,
    o: kOS.win
  }),
  omniPayload_: <SettingsNS.VomnibarPayload> As_<SettingsNS.DeclaredVomnibarPayload>({
    v: Build.BTypes & BrowserType.Chrome ? CurCVer_ : Build.BTypes & BrowserType.Firefox ? CurFFVer_ : 0,
    o: kOS.win,
    a: 0,
    n: 0,
    t: 0,
    l: "",
    s: "",
    c: "",
    k: null
  }),
  i18nPayload_: null as string[] | null,
  newTabs_: BgUtils_.safeObj_() as ReadonlySafeDict<Urls.NewTabType>,
  extAllowList_: null as never as SafeDict<boolean | string>,
  storage_: localStorage,
  get_<K extends keyof SettingsWithDefaults> (key: K, forCache?: boolean): SettingsWithDefaults[K] {
    if (key in this.cache_) {
      return (this.cache_ as SettingsWithDefaults)[key];
    }
    const initial = this.defaults_[key], str = this.storage_.getItem(key);
    const value = str == null ? initial : typeof initial === "string" ? str
        : initial === false || initial === true ? str === "true"
        : JSON.parse<typeof initial>(str);
    forCache && ((this.cache_ as Generalized<SettingsNS.FullCache>)[key] = value as SettingsWithDefaults[K]);
    return value as SettingsWithDefaults[K];
  },
  set_<K extends keyof FullSettings> (key: K, value: FullSettings[K]): void {
    const a = this;
    type PersistentKeys = keyof SettingsNS.PersistentSettings;
    (a.cache_ as Generalized<SettingsNS.FullCache>)[key] = value;
    if (!(key in a.nonPersistent_)) {
      const initial = a.defaults_[key as PersistentKeys];
      if (value === initial) {
        a.storage_.removeItem(key);
        a.sync_(key as PersistentKeys, null);
      } else {
        a.storage_.setItem(key, typeof initial === "string" ? value as string : JSON.stringify(value));
        a.sync_(key as PersistentKeys, value as FullSettings[PersistentKeys]);
      }
      if (key in a.valuesToLoad_) {
        a.updatePayload_(a.valuesToLoad_[key as keyof typeof a.valuesToLoad_]
            , value as FullSettings[keyof typeof a.valuesToLoad_], a.payload_)
      }
    }
    let ref: SettingsNS.SimpleUpdateHook<K> | undefined;
    if (ref = a.updateHooks_[key as keyof SettingsWithDefaults] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref.call(a, value, key);
    }
  },
  postUpdate_: function<K extends keyof SettingsWithDefaults> (this: {}, key: K, value?: FullSettings[K]): void {
    type AllK = keyof SettingsWithDefaults;
    return (Settings_.updateHooks_[key as AllK] as SettingsNS.SimpleUpdateHook<AllK>).call(
      this as typeof Settings_,
      value !== undefined ? value : Settings_.get_(key), key);
  } as {
    <K extends SettingsNS.NullableUpdateHooks>(key: K, value?: FullSettings[K] | null): void;
    <K extends SettingsNS.EnsuredUpdateHooks | keyof SettingsWithDefaults>(key: K, value?: FullSettings[K]): void;
  },
  broadcast_<K extends kBgReq.settingsUpdate | kBgReq.url | kBgReq.keyFSM> (
      request: K extends kBgReq.settingsUpdate ? SettingsUpdateMsg : Req.bg<K>): void {
    if (request.N !== kBgReq.settingsUpdate) {
      Settings_._BroadcastSettingsUpdates(request);
    } else if (((request as SettingsUpdateMsg).d as Extract<SettingsUpdateMsg["d"], string[]>).length == null) {
      Settings_._BroadcastSettingsUpdates(request)
    } else {
      let cur = (request as SettingsUpdateMsg).d as Extract<SettingsUpdateMsg["d"], string[]>,
      old = Settings_.temp_.newSettingsToBroadcast_
      if (old) {
        cur = cur.concat(old)
      } else if ((Build.MinCVer >= BrowserVer.Min$queueMicrotask || !(Build.BTypes & BrowserType.Chrome))
          && (Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask || !(Build.BTypes & BrowserType.Firefox))
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) {
        queueMicrotask(Settings_._BroadcastSettingsUpdates.bind(null, request));
      } else {
        Promise.resolve(request).then(Settings_._BroadcastSettingsUpdates);
      }
      Settings_.temp_.newSettingsToBroadcast_ = cur;
      (request as SettingsUpdateMsg).d = null as never
    }
  },
  _BroadcastSettingsUpdates<K extends keyof BgReq> (this: void
      , request: K extends kBgReq.settingsUpdate ? SettingsUpdateMsg : Req.bg<K>): void {
    if (request.N === kBgReq.settingsUpdate && !(request as SettingsUpdateMsg).d) {
      const obj = Settings_.temp_.newSettingsToBroadcast_!
      const d: BgReq[kBgReq.settingsUpdate]["d"] = (request as Req.bg<kBgReq.settingsUpdate>).d = {}
      for (const key of obj) {
        (d as Generalized<typeof d>)[key] = Settings_.payload_[key]
      }
      Settings_.temp_.newSettingsToBroadcast_ = null;
    }
    const ref = Backend_.indexPorts_();
    for (const tabId in ref) {
      const frames = ref[+tabId]!;
      for (let i = frames.length; 0 < --i; ) {
        frames[i].postMessage(request as Req.baseBg<K> as Req.bg<K>);
      }
    }
  },
  broadcastOmni_<K extends ValidBgVomnibarReq> (request: Req.bg<K>): void {
    for (const frame of Backend_.indexPorts_(GlobalConsts.VomnibarFakeTabId)) {
      frame.postMessage(request);
    }
  },
  /** @argument value may come from `LinkHints.*::characters` and `kBgCmd.toggle::value` */
  updatePayload_: function (shortKey: keyof SettingsNS.FrontendSettingsSyncingItems, value: any
      , obj?: Partial<SettingsNS.FrontendSettingCache>
      ): SettingsNS.FrontendSettingsSyncingItems[keyof SettingsNS.FrontendSettingsSyncingItems][1] {
    type SettingType<T> = T extends keyof SettingsNS.FullSettings ? SettingsNS.FullSettings[T] : never
    type ValType<T extends keyof SettingsNS.AutoSyncedItems> = SettingType<SettingsNS.AutoSyncedItems[T][0]>;
    switch (shortKey) {
    case "c": case "n": value = (value as ValType<"c" | "n">).toLowerCase().toUpperCase!(); break
    case "i":
      value = value === !!value ? value
        : (value as ValType<"i">) > 1 || (value as ValType<"i">) > 0 && !Settings_.payload_.o; break
    case "d": value = value ? " D" : ""; break
    // no default:
    }
    return obj ? (obj as Generalized<SettingsNS.FrontendSettingCache>)[shortKey] = value : value
  } as <T extends keyof (SettingsNS.FrontendSettingsSyncingItems)>
      (shortKey: T
      , value: T extends keyof SettingsNS.AutoSyncedItems ? FullSettings[SettingsNS.AutoSyncedItems[T][0]]
          : T extends keyof SettingsNS.ManuallySyncedItems
            ? T extends "d" ? FullSettings["autoDarkMode"] : SettingsNS.ManuallySyncedItems[T][1]
          : never
      , obj?: Partial<SettingsNS.FrontendSettingCache>
      ) => (SettingsNS.FrontendSettingsSyncingItems)[T][1],
  updateOmniStyles_: BgUtils_.blank_ as (key: MediaNS.kName, embed?: 1 | undefined) => void,
  updateMediaQueries_: BgUtils_.blank_ as (this: void) => void,
  parseCustomCSS_ (css: string): SettingsNS.ParsedCustomCSS {
    const arr = css ? css.split(<RegExpG & RegExpSearchable<1>> /^\/\*\s?#!?([A-Za-z:]+)\s?\*\//m) : [""];
    const map: SettingsNS.ParsedCustomCSS = { ui: arr[0].trim() };
    for (let i = 1; i < arr.length; i += 2) {
      let key = arr[i].toLowerCase() as "ui" | "find" | "find:host" | "omni";
      map[key] = (map[key] || "") + arr[i + 1].trim();
    }
    return map;
  },
  mergeCustomCSS_ (css2Str: string, virtual?: 1): Ensure<SettingsNS.ParsedCustomCSS, "ui" | "find" | "omni"> {
    const a = Settings_, I = "innerCSS"
    let css = a.storage_.getItem(I)!, idx = css.indexOf("\n")
    css = idx > 0 ? css.slice(0, idx) : css
    const css2 = a.parseCustomCSS_(css2Str)
    let innerCSS = css2.ui ? css + "\n" + css2.ui : css
    let findh = css2["find:host"], find2 = css2.find, omni2 = css2.omni, F = "findCSS", O = "omniCSS"
    css = a.storage_.getItem(F)!
    idx = css.indexOf("\n")
    css = css.slice(0, idx + 1 + +css.slice(0, idx))
    let endFH = css.indexOf("\n", css.indexOf("\n", idx + 1) + 1), offsetFH = css.lastIndexOf("  ", endFH)
    findh = findh ? "  " + findh.replace(<RegExpG> /\n/g, " ") : ""
    if (offsetFH > 0 ? css.slice(offsetFH, endFH) !== findh : findh) {
      css = css.slice(idx + 1, offsetFH > 0 ? offsetFH : endFH) + findh + css.slice(endFH)
      css = css.length + "\n" + css
    }
    find2 = find2 ? css + "\n" + find2 : css
    css = (a.storage_.getItem(O) || "").split("\n", 1)[0]
    omni2 = omni2 ? css + "\n" + omni2 : css
    if (!virtual) {
      a.storage_.setItem(F, find2)
      omni2 ? a.storage_.setItem(O, omni2) : a.storage_.removeItem(O)
      a.set_(I, innerCSS)
    }
    return { ui: innerCSS, find: find2, omni: omni2 }
  },
  parseFindCSS_ (find2: string): FindCSS {
    find2 = find2.slice(find2.indexOf("\n") + 1);
    let idx = find2.indexOf("\n") + 1, endFH = find2.indexOf("\n", idx);
    return { c: find2.slice(0, idx - 1), s: find2.slice(idx, endFH).replace("  ", "\n"),
      i: find2.slice(endFH + 1) }
  },
  updateHooks_: As_<{ [key in SettingsNS.DeclaredUpdateHooks]: SettingsNS.UpdateHook<key>; } & SafeObject>({
    __proto__: null as never,
    extAllowList (val): void {
      const old = Settings_.extAllowList_;
      const map = Settings_.extAllowList_ = BgUtils_.safeObj_<boolean>();
      if (old && Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
        for (const key in old) { if (old[key] === false) { map[key] = false; } }
      }
      if (!val) { return; }
      for (let arr = val.split("\n"), i = arr.length, wordCharRe = /^[\da-z_]/i as RegExpI; 0 <= --i; ) {
        if ((val = arr[i].trim()) && wordCharRe.test(val)) {
          map[val] = true;
        }
      }
    },
    grabBackFocus (this: {}, value: FullSettings["grabBackFocus"]): void {
      Settings_.payload_.g = value;
    },
    newTabUrl (this: {}, url): void {
      url = (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(url)
        ? chrome.runtime.getURL(url) : BgUtils_.convertToUrl_(url);
      Settings_.set_("newTabUrl_f", url)
    },
    searchEngines (this: {}): void {
      return Settings_.set_("searchEngineMap", BgUtils_.safeObj_<Search.Engine>());
    },
    searchEngineMap (this: {}, value: FullSettings["searchEngineMap"]): void {
      const a = Settings_;
      "searchKeywords" in a.cache_ && a.set_("searchKeywords", null);
      // Note: this requires `searchUrl` must be a valid URL
      if (!(Build.NDEBUG || BgUtils_.protocolRe_.test(a.get_("searchUrl")))) {
        console.log('Assert error: BgUtils_.protocolRe_.test(Settings_.get_("searchUrl"))');
      }
      const rules = BgUtils_.parseSearchEngines_("~:" + a.get_("searchUrl") + "\n" + a.get_("searchEngines"), value);
      return a.set_("searchEngineRules", rules);
    },
    searchUrl (str): void {
      const cache = Settings_.cache_ as WritableSettingsCache;
      if (str) {
        BgUtils_.parseSearchEngines_("~:" + str, cache.searchEngineMap);
      } else {
        const initialMap: { "~": Search.Engine } = {
          "~": { name_: "~", blank_: "", url_: Settings_.get_("searchUrl").split(" ", 1)[0] }
        };
        cache.searchEngineMap = initialMap as SafeObject & typeof initialMap;
        cache.searchEngineRules = [];
        Build.MayOverrideNewTab && Settings_.get_("focusNewTabContent", true);
        if (Settings_.get_("newTabUrl_f", true)) {
          return
        }
      }
      return Settings_.postUpdate_("newTabUrl");
    },
    baseCSS (this: {}, css): void {
      const a = Settings_, cacheId = a.CONST_.StyleCacheId_,
      browserVer = CurCVer_,
      browserInfo = cacheId.slice(cacheId.indexOf(",") + 1),
      hasAll = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinUsableCSS$All
          || browserInfo.includes("a");
      if (!(Build.NDEBUG || css.startsWith(":host{"))) {
        console.log('Assert error: `css.startsWith(":host{")` in Settings_.updateHooks_.baseCSS');
      }
      if (Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinUnprefixedUserSelect
            && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
          ? CurFFVer_ < FirefoxBrowserVer.MinUnprefixedUserSelect
          : Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinUnprefixedUserSelect
            && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
          ? browserVer < BrowserVer.MinUnprefixedUserSelect
          : false) {
        // on Firefox, the `-webkit` prefix is in the control of `layout.css.prefixes.webkit`
        css = css.replace(<RegExpG> /user-select\b/g, Build.BTypes & BrowserType.Firefox
            && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) ? "-moz-$&" : "-webkit-$&")
      }
      if (!Build.NDEBUG) {
        css = css.replace(<RegExpG> /\r\n?/g, "\n");
      }
      const findOffset = css.lastIndexOf("/*#find*/");
      const isHighContrast_ff = !!(Build.BTypes & BrowserType.Firefox)
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
          && Settings_.storage_.getItem(GlobalConsts.kIsHighContrast) == "1"
      let findCSS = css.slice(findOffset + /* '/*#find*\/\n' */ 10);
      let omniCSS = "";
      css = css.slice(0, findOffset - /* `\n` */ 1);
      if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinUsableCSS$All || hasAll) {
        // Note: must not move "all:" into ":host" even when "s" and >= MinSelector$deep$InDynamicCssMeansNothing
        // in case that ":host" is set [style="all:unset"]
        const ind2 = css.indexOf("all:"), ind1 = css.lastIndexOf("{", ind2),
        ind3 = Build.MinCVer >= BrowserVer.MinEnsuredSafeInnerCSS || !(Build.BTypes & BrowserType.Chrome)
              || browserVer >= BrowserVer.MinEnsuredSafeInnerCSS
          ? css.indexOf(";", ind2) : css.length;
        css = css.slice(0, ind1 + 1) + css.slice(ind2, ind3 + 1)
            + css.slice(css.indexOf("\n", ind3) + 1 || css.length);
      } else {
        css = css.replace(<RegExpOne> /all:\s?\w+;?/, "");
      }
      if ((Build.MinCVer >= BrowserVer.MinEnsuredDisplayContents || !(Build.BTypes & BrowserType.Chrome)
            || browserVer >= BrowserVer.MinEnsuredDisplayContents)
          && !(Build.BTypes & BrowserType.Edge
                && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge))) {
        const ind2 = css.indexOf("display:"), ind1 = css.lastIndexOf("{", ind2);
        css = css.slice(0, ind1 + 1) + css.slice(ind2);
      } else {
        css = css.replace("contents", "block");
      }
      if (Build.MinCVer < BrowserVer.MinSpecCompliantShadowBlurRadius
          && Build.BTypes & BrowserType.Chrome
          && browserVer < BrowserVer.MinSpecCompliantShadowBlurRadius) {
        css = css.replace("3px 5px", "3px 7px");
      }
      if ((Build.BTypes & (BrowserType.Chrome | BrowserType.Edge) && Build.MinCVer < BrowserVer.MinCSS$Color$$RRGGBBAA
          && ((!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && OnOther === BrowserType.Edge)
            || browserVer < BrowserVer.MinCSS$Color$$RRGGBBAA
          ))) {
        css = css.replace(<RegExpG & RegExpSearchable<0>> /#[\da-f]{4}([\da-f]{4})?\b/gi, function (s: string): string {
          s = s.length === 5 ? "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] + s[4] + s[4] : s
          const color = parseInt(s.slice(1), 16),
          r = color >>> 24, g = (color >> 16) & 0xff, b = (color >> 8) & 0xff, alpha = (color & 0xff) / 255 + "";
          return `rgba(${r},${g},${b},${alpha.slice(0, 4)})`;
        });
      }
      if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome
          || (Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
              && browserVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)) {
        css = css.replace(".LH{", ".LH{box-sizing:border-box;");
      }
      if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox) {
        const ind1 = css.indexOf(".LH{") + 4, ind2 = css.indexOf("}", ind1)
        let items = css.slice(ind1, ind2).replace("2.5px 3px 2px", "3px").replace("0.5px", "1px")
        if (isHighContrast_ff) {
          items = items.replace(<RegExpOne> /\bbackground:[^;}]+/, "background:#000")
        }
        css = css.slice(0, ind1) + items + css.slice(ind2)
      }
      if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
          && !browserInfo.includes("s")) {
        /** Note: {@link ../front/vimium-c.css}: this requires `:host{` is at the beginning */
        const hostEnd = css.indexOf("}") + 1, secondEnd = css.indexOf("}", hostEnd) + 1,
        prefix = "#VimiumUI";
        let body = css.slice(secondEnd);
        if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinUsableCSS$All || hasAll) {
          body = body.replace(<RegExpG> /\b[IL]H\s?\{/g, "$&all:inherit;");
        }
        body += `${prefix}:before,${prefix}:after,.R:before,.R:not(.HUD):after{display:none!important}`;
        css = prefix + css.slice(5, hostEnd) +
            /** Note: {@link ../front/vimium-c.css}: this requires no ID/attr selectors in "ui" styles */
            body.replace(<RegExpG> /\.[A-Z][^,{]*/g, prefix + " $&");
      }
      if (!(Build.BTypes & BrowserType.Chrome) || !IsEdg_) {
        findCSS = findCSS.replace("@media(-ms-high-contrast:active){", "").slice(0, -1)
      }
      if (Build.BTypes & BrowserType.Firefox && isHighContrast_ff) {
        css = css.split("\n.D", 1)[0]
      } else if (!(Build.BTypes & BrowserType.Chrome) || !IsEdg_) {
        css = css.split("\nbody", 1)[0]
      }
      if (Build.BTypes & BrowserType.ChromeOrFirefox) {
        findCSS = findCSS.replace((Build.BTypes & BrowserType.Firefox
              ? isHighContrast_ff || Build.BTypes & BrowserType.Chrome && IsEdg_ : IsEdg_)
            ? <RegExpG> /\.HC\b/g : <RegExpG> /\.HC\b[^]+?}\s?/g, "").trim()
      }
      if (Build.BTypes & BrowserType.Firefox && isHighContrast_ff) {
        omniCSS = 'body:after{content:"";}#toolbar{opacity:1;}#toggle-dark{display:none;}.btn_svg{stroke:#999;}'
                + ":hover>.btn_svg{stroke:currentColor;}.s,.item:hover{border-bottom-style:solid;}"
                + ".s>.top,:hover>.top{font-weight:bold;--c:currentColor;}"
      }
      css = css.replace(<RegExpG> /\n/g, "")
      css = cacheId + ";" + css;
      if (Build.BTypes && BrowserType.Firefox) { omniCSS = omniCSS && omniCSS.replace(<RegExpG> /\n/g, "") }
      const css2 = a.parseCustomCSS_(a.get_("userDefinedCss"));
      let findh = css2["find:host"], find2 = css2.find, omni2 = css2.omni, O = "omniCSS"
      css2.ui && (css += "\n" + css2.ui);
      if (Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo && Build.BTypes & BrowserType.Chrome
          && browserVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo) {
        css = css.replace(<RegExpG> /0\.01px|\/\*!DPI\*\/ ?[\w.]+/g, "/*!DPI*/1px");
      } else if (Build.MinCVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor && Build.BTypes & BrowserType.Chrome
          && browserVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor) {
        css = css.replace(<RegExpG> /0\.01px|\/\*!DPI\*\/ ?[\w.]+/g, "0.5px");
      }
      if (findh) {
        const idx = findCSS.indexOf("\n", findCSS.indexOf("\n") + 1)
        findCSS = `${findCSS.slice(0, idx)}  ${findh.replace(<RegExpG> /\n/g, " ")}\n${findCSS.slice(idx)}`
      }
      a.storage_.setItem("findCSS", findCSS.length + "\n" + findCSS + (find2 ? "\n" + find2 : ""));
      omniCSS || omni2 ? a.storage_.setItem(O,  omni2 ? omniCSS + "\n" + omni2 : omniCSS) : a.storage_.removeItem(O)
      return a.set_("innerCSS", css);
    },
    userDefinedCss (this: {}, css2Str): void {
      const a = Settings_;
      a.mergeCustomCSS_(css2Str);
      const ref = Backend_.indexPorts_(), request: Req.bg<kBgReq.showHUD> = {
        N: kBgReq.showHUD, H: a.cache_.innerCSS, f: a.cache_.findCSS
      };
      for (const tabId in ref) {
        const frames = ref[+tabId]!;
        for (let i = frames.length; 0 < --i; ) {
          const status = frames[i].s;
          if (status.f & Frames.Flags.hasCSS) {
            frames[i].postMessage(request);
            status.f |= Frames.Flags.hasFindCSS;
          }
        }
      }
      a.broadcastOmni_({ N: kBgReq.omni_updateOptions, d: { c: a.omniPayload_.c } });
    },
    mapModifier (this: {}, value: FullSettings["mapModifier"]): void {
      type DeltaType = BgVomnibarSpecialReq[kBgReq.omni_updateOptions]["d"]
      Settings_.broadcastOmni_({ N: kBgReq.omni_updateOptions, d:
        As_<Pick<DeltaType, SelectNameToKey<SettingsNS.AllVomnibarItems>["mapModifier"]>>({ a: value })
      })
    },
    innerCSS (this: {}, css): void {
      const a = Settings_, cache = a.cache_ as WritableSettingsCache;
      let findCSS = a.storage_.getItem("findCSS"), omniCSS = a.storage_.getItem("omniCSS") || ""
      if (!findCSS) { a.fetchFile_("baseCSS"); return; }
      cache.findCSS = a.parseFindCSS_(findCSS)
      // Note: The lines below are allowed as a special use case
      cache.innerCSS = css.slice(a.CONST_.StyleCacheId_.length + 1);
      a.omniPayload_.c = omniCSS
    },
    vomnibarPage (this: {}, url): void {
      const a = Settings_, cur = a.storage_.getItem("vomnibarPage_f");
      if (cur && !url) {
        (a.cache_ as WritableSettingsCache).vomnibarPage_f = cur;
        return;
      }
      url = url || a.get_("vomnibarPage");
      if (url === a.defaults_.vomnibarPage) {
        url = a.CONST_.VomnibarPageInner_;
      } else if (url.startsWith("front/")) {
        url = chrome.runtime.getURL(url);
      } else {
        url = BgUtils_.convertToUrl_(url);
        url = BgUtils_.reformatURL_(url);
        if (Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
            && Build.BTypes & BrowserType.Chrome
            && CurCVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg && !url.startsWith(BrowserProtocol_)) {
          url = a.CONST_.VomnibarPageInner_;
        } else {
          url = url.replace(":version", "" + parseFloat(a.CONST_.VerCode_));
        }
      }
      a.set_("vomnibarPage_f", url);
    },
    vomnibarOptions (this: {}, options: SettingsNS.BackendSettings["vomnibarOptions"] | null): void {
      const a = Settings_, defaultOptions = a.defaults_.vomnibarOptions,
      payload = a.omniPayload_;
      let isSame = true;
      let { actions, maxMatches, queryInterval, styles, sizes } = defaultOptions;
      if (options !== defaultOptions && options && typeof options === "object") {
        const newMaxMatches = Math.max(3, Math.min((options.maxMatches | 0) || maxMatches
            , GlobalConsts.MaxLimitOfVomnibarMatches)),
        newActions = ((options.actions || "") + "").trim(),
        newInterval = +options.queryInterval,
        newSizes = ((options.sizes || "") + "").trim(),
        newStyles = ((options.styles || "") + "").trim(),
        newQueryInterval = Math.max(0, Math.min(newInterval >= 0 ? newInterval : queryInterval, 1200));
        isSame = maxMatches === newMaxMatches && queryInterval === newQueryInterval
                  && newSizes === sizes && actions === newActions
                  && styles === newStyles;
        if (!isSame) {
          maxMatches = newMaxMatches;
          queryInterval = newQueryInterval;
          sizes = newSizes;
          styles = newStyles;
        }
        options.actions = newActions
        options.maxMatches = newMaxMatches;
        options.queryInterval = newQueryInterval;
        options.sizes = newSizes;
        options.styles = newStyles;
      }
      (a.cache_ as WritableSettingsCache).vomnibarOptions = isSame ? defaultOptions : options!;
      payload.n = maxMatches;
      payload.t = queryInterval;
      payload.l = sizes;
      payload.s = styles;
      a.updateOmniStyles_(MediaNS.kName.PrefersReduceMotion, 1);
      a.updateOmniStyles_(MediaNS.kName.PrefersColorScheme, 1);
      a.broadcastOmni_({ N: kBgReq.omni_updateOptions, d: {
        n: maxMatches,
        t: queryInterval,
        l: sizes,
        s: payload.s
      } });
    }
  }) as { [key in SettingsNS.DeclaredUpdateHooks]: SettingsNS.UpdateHook<key>; } as SettingsNS.FullUpdateHookMap,
  /** can only fetch files in the `[ROOT]/front` folder */
  fetchFile_ (file: "words" | keyof SettingsNS.CachedFiles, callback?: (this: void) => any): void {
    if (callback && file in this.cache_) { callback(); return; }
    let filePath = this.CONST_[file];
    if (!filePath) { throw Error("unknown file: " + file); } // just for debugging
    filePath = "/front/" + filePath;
    if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinFetchExtensionFiles
        || CurCVer_ >= BrowserVer.MinFetchExtensionFiles) {
      fetch(filePath).then(r => r.text()).then(onLoad);
      return;
    }
    const req = new XMLHttpRequest() as TextXHR;
    req.open("GET", filePath, true);
    req.responseType = "text";
    req.onload = function (): void {
      onLoad(this.responseText);
    };
    function onLoad(text: string): void {
      if (file === "baseCSS") {
        Settings_.postUpdate_(file, text);
      } else if ((Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
          || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
              && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces)
          && file === "words") {
        Settings_.CONST_.words = text.replace(<RegExpG> /[\n\r]/g, ""
            ).replace(<RegExpG & RegExpSearchable<1>> /\\u(\w{4})/g, (_, s1) => String.fromCharCode(+("0x" + s1)));
      } else {
        Settings_.set_(file as Exclude<typeof file, "baseCSS" | "words">, text);
      }
      callback && setTimeout(callback, 0);
    }
    req.send();
  },
  // clear localStorage & sync, if value === @defaults[key]
  // the default of all nullable fields must be set to null for compatibility with @Sync.set
  defaults_: As_<Readonly<SettingsWithDefaults> & SafeObject>({
    __proto__: null as never,
    autoDarkMode: true,
    autoReduceMotion: false,
    clipSub: "",
    dialogMode: false,
    exclusionListenHash: true,
    exclusionOnlyFirstMatch: false,
    exclusionRules: [{pattern: ":https://mail.google.com/", passKeys: ""}] as ExclusionsNS.StoredRule[],
    extAllowList: !(Build.BTypes & ~BrowserType.Chrome)
      || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome
? `# modified versions of X New Tab and PDF Viewer,
# NewTab Adapter, and Shortcuts Forwarding Tool
hdnehngglnbnehkfcidabjckinphnief
nacjakoppgmdcpemlfnfegmlhipddanj
cglpcedifkgalfdklahhcchnjepcckfn
clnalilglegcjmlgenoppklmfppddien`
: !(Build.BTypes & ~BrowserType.Firefox)
  || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
? `# extension id or hostname
newtab-adapter@gdh1995.cn
shortcut-forwarding-tool@gdh1995.cn`
: "",
    filterLinkHints: false,
    findModeRawQueryList: "",
    focusNewTabContent: true,
    grabBackFocus: false,
    hideHud: false,
    ignoreCapsLock: 0,
    ignoreKeyboardLayout: false,
    innerCSS: "",
    keyboard: [560, 33],
    keyMappings: "",
    linkHintCharacters: "sadjklewcmpgh",
    linkHintNumbers: "0123456789",
    localeEncoding: "gbk",
    mapModifier: 0,
    mouseReachable: true,
    newTabUrl: "",
    newTabUrl_f: "",
    nextPatterns: "\u4e0b\u4e00\u5c01,\u4e0b\u9875,\u4e0b\u4e00\u9875,\u4e0b\u4e00\u7ae0,\u540e\u4e00\u9875\
,next,more,newer,>,\u203a,\u2192,\xbb,\u226b,>>",
    omniBlockList: "",
    previousPatterns: "\u4e0a\u4e00\u5c01,\u4e0a\u9875,\u4e0a\u4e00\u9875,\u4e0a\u4e00\u7ae0,\u524d\u4e00\u9875\
,prev,previous,back,older,<,\u2039,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: (navigator.language as string).startsWith("zh") ? "https://www.baidu.com/s?ie=utf-8&wd=%s \u767e\u5ea6"
      : "https://www.google.com/search?q=%s Google",
    searchEngines: `b|ba|baidu: https://www.baidu.com/s?ie=utf-8&wd=%s Baidu
bi|bing: https://www.bing.com/search?q=%s Bing
g|go|gg|google: https://www.google.com/search?q=%s Google
js\\:|Js: javascript:\\ $S; JavaScript
w|wiki:\\
  https://www.wikipedia.org/w/index.php?search=%s Wikipedia
v.m|v\\:math: vimium://math\\ $S re= Calculate

# More examples.
#
# (Vimium C supports search completion Google, Wikipedia,
# and so on, as above, and for these.)
#
# l: https://www.google.com/search?q=%s&btnI I'm feeling lucky
# y: https://www.youtube.com/results?search_query=%s YouTube
# gm: https://www.google.com/maps?q=%s Google maps
# d: https://duckduckgo.com/?q=%s DuckDuckGo
# az: https://www.amazon.com/s/?field-keywords=%s Amazon
# qw: https://www.qwant.com/?q=%s Qwant`,
    searchEngineMap: {} as SafeDict<any>,
    showActionIcon: true,
    showAdvancedCommands: true,
    showAdvancedOptions: true,
    showInIncognito: false,
    notifyUpdate: true,
    smoothScroll: true,
    vomnibarOptions: {
      maxMatches: 10,
      queryInterval: 333,
      sizes: VomnibarNS.PixelData.OthersIfEmpty + ","
          + (VomnibarNS.PixelData.OthersIfNotEmpty - VomnibarNS.PixelData.OthersIfEmpty) + ","
          + VomnibarNS.PixelData.Item
          ,
      styles: "mono-url",
      actions: ""
    },
    userDefinedCss: "",
    vimSync: null,
    vomnibarPage: "front/vomnibar.html",
    vomnibarPage_f: "",
    waitForEnter: true
  }),
  legacyNames_: As_<SettingsNS.LegacyNames & SafeObject>({ __proto__: null as never,
    extWhiteList: "extAllowList",
    phraseBlacklist: "omniBlockList"
  }),
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent_: As_<TypedSafeEnum<SettingsNS.NonPersistentSettings>>({ __proto__: null as never,
    baseCSS: 1, helpDialog: 1,
    searchEngineMap: 1, searchEngineRules: 1, searchKeywords: 1
  }),
  frontUpdateAllowed_: As_<ReadonlyArray<keyof SettingsNS.FrontUpdateAllowedSettings>>(["showAdvancedCommands"]),
  icons_: !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther & BrowserType.Chrome
      ? As_<readonly [IconNS.BinaryPath, IconNS.BinaryPath, IconNS.BinaryPath]>([
    "icons/enabled.bin", "icons/partial.bin", "icons/disabled.bin"
  ]) : As_<readonly [IconNS.ImagePath, IconNS.ImagePath, IconNS.ImagePath]>([
    { 19: "/icons/enabled_19.png", 38: "/icons/enabled_38.png" },
    { 19: "/icons/partial_19.png", 38: "/icons/partial_38.png" },
    { 19: "/icons/disabled_19.png", 38: "/icons/disabled_38.png" }
  ]),
  valuesToLoad_: <SettingsNS.AutoSyncedNameMap> As_<SettingsNS.AutoSyncedNameMap & SafeObject>({
    __proto__: null as never,
    filterLinkHints: "f",
    ignoreCapsLock: "i",
    ignoreKeyboardLayout: "l",
    mapModifier: "a",
    mouseReachable: "e",
    keyboard: "k", linkHintCharacters: "c", linkHintNumbers: "n",
    regexFindMode: "r", smoothScroll: "s", scrollStepSize: "t", waitForEnter: "w"
  }),
  sync_: BgUtils_.blank_ as SettingsNS.Sync["set"],
  restore_: null as (() => Promise<void> | null) | null,
  CONST_: {
    AllowClipboardRead_: true,
    BaseCSSLength_: 0,
    // should keep lower case
    NtpNewTab_: Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
        ? Build.MayOverrideNewTab ? "https://www.msn.cn/spartan/ntp" : "h"
        : Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
        ? IsEdg_ ? "https://www.msn.cn/spartan/ntp" : "chrome-search://local-ntp/local-ntp.html" : "pages/blank.html",
    BlankNewTab_: "pages/blank.html",
    DisallowIncognito_: false,
    ContentScripts_: null as never as string[],
    VerCode_: "", VerName_: "",
    GitVer: BuildStr.Commit as string,
    StyleCacheId_: "",
    Injector_: "/lib/injector.js",
    KnownPages_: ["blank", "newtab", "options", "show"],
    MathParser: "/lib/math_parser.js",
    HelpDialog: "/background/help_dialog.js",
    KeyMappings: "/background/key_mappings.js",
    InjectEnd_: "content/injected_end.js",
    NewTabForNewUser_: Build.MayOverrideNewTab ? "pages/options.html#!newTabUrl" : "",
    OverrideNewTab_: Build.MayOverrideNewTab ? true : false,
    OptionsUIOpenInTab_: Build.NoDialogUI ? true : false,
    OptionsPage_: "pages/options.html", Platform_: "browser",
    baseCSS: "vimium-c.css",
    helpDialog: "help_dialog.html",
    words: Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
      || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      ? "words.txt" : "",
    PolyFill_: Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && Build.BTypes & BrowserType.Chrome
      ? "lib/polyfill.js" : "",
    HomePage_: "https://github.com/gdh1995/vimium-c",
    RedirectedUrls_: {
      about: "",
      changelog: "/RELEASE-NOTES.md",
      help: "/wiki",
      home: "",
      license: "/LICENSE.txt",
      permissions: "/PRIVACY-POLICY.md#permissions-required",
      policy: "/PRIVACY-POLICY.md",
      popup: "options.html",
      privacy: "/PRIVACY-POLICY.md#privacy-policy",
      readme: "#readme",
      release: "/RELEASE-NOTES.md",
      "release-notes": "/RELEASE-NOTES.md",
      settings: "options.html",
      wiki: "/wiki",
      __proto__: null as never
    },
    GlobalCommands_: null as never as Array<keyof ShortcutInfoMap>,
    ShowPage_: "pages/show.html",
    VomnibarPageInner_: "", VomnibarScript_: "/front/vomnibar.js", VomnibarScript_f_: ""
  }
};

if (!(Build.BTypes & BrowserType.Edge) || chrome.runtime.getPlatformInfo) {
chrome.runtime.getPlatformInfo(function (info): void {
  const os = (Build.BTypes & ~BrowserType.Chrome ? info.os || "" : info.os).toLowerCase(),
  types = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinRuntimePlatformOs
    ? chrome.runtime.PlatformOs!
    : chrome.runtime.PlatformOs || { MAC: "mac", WIN: "win" },
  osEnum = os === types.WIN ? kOS.win : os === types.MAC ? kOS.mac : kOS.unixLike,
  ignoreCapsLock = Settings_.get_("ignoreCapsLock");
  Settings_.CONST_.Platform_ = os;
  (Settings_.omniPayload_ as Writable<typeof Settings_.omniPayload_>).o =
  (Settings_.payload_ as Writable<typeof Settings_.payload_>).o = osEnum;
  Settings_.updatePayload_("i", ignoreCapsLock, Settings_.payload_)
  Settings_.temp_.initing_ |= BackendHandlersNS.kInitStat.platformInfo;
  Backend_ && Backend_.onInit_!();
});
} else {
  Settings_.CONST_.Platform_ = Build.BTypes & BrowserType.Edge
    && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge) ? "win" : "unknown";
  Settings_.updatePayload_("i", Settings_.get_("ignoreCapsLock"), Settings_.payload_)
  Settings_.temp_.initing_ |= BackendHandlersNS.kInitStat.platformInfo;
}

if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
  || Build.BTypes & BrowserType.Edge
  || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
  ( (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox))
    ? !Build.NativeWordMoveOnFirefox
      && !BgUtils_.makeRegexp_("\\p{L}", "u", 0)
    : Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge) ? true
    : Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      && Build.MinCVer < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
      && (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
        ? CurCVer_ < (
          BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
          ? BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp : BrowserVer.MinSelExtendForwardOnlySkipWhitespaces)
        : CurCVer_ < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
          || !BgUtils_.makeRegexp_("\\p{L}", "u", 0))
  ) ? Settings_.fetchFile_("words") : (Settings_.CONST_.words = "");
}

(function (): void {
  const ref = chrome.runtime.getManifest(), { origin } = location, prefix = origin + "/",
  ref2 = ref.content_scripts[0].js,
  settings = Settings_,
  { CONST_: obj, defaults_: defaults, valuesToLoad_, payload_ } = settings,
  // on Edge, https://www.msn.cn/spartan/ntp also works with some complicated search parameters
  // on Firefox, both "about:newtab" and "about:home" work,
  //   but "about:newtab" skips extension hooks and uses last configured URL, so it's better.
  EdgNewTab = "edge://newtab",
  CommonNewTab = Build.BTypes & BrowserType.Edge
      && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
    ? "about:home" : "about:newtab", ChromeNewTab = "chrome://newtab",
  ref3 = settings.newTabs_ as Writable<typeof settings.newTabs_>;
  function func(path: string): string {
    return (path.charCodeAt(0) === kCharCode.slash ? origin : path.startsWith(prefix) ? "" : prefix) + path;
  }
  if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
    (payload_ as Writable<typeof payload_>).b =
        (settings.omniPayload_ as Writable<typeof settings.omniPayload_>).b = OnOther;
  }
  if (Build.MayOverrideNewTab) {
    const overrides = ref.chrome_url_overrides, hasNewTab = overrides && overrides.newtab;
    settings.CONST_.OverrideNewTab_ = !!hasNewTab;
    ref3[func(hasNewTab || "pages/newtab.html")] = Urls.NewTabType.vimium;
  }
  if (!Build.NoDialogUI) {
    const options_ui = ref.options_ui, open_in_tab = options_ui && options_ui.open_in_tab;
    settings.CONST_.OptionsUIOpenInTab_ = !!open_in_tab;
  }
  if (Build.MayOverrideNewTab && !settings.CONST_.OverrideNewTab_) {
    obj.NewTabForNewUser_ = (Build.BTypes & ~BrowserType.Chrome
        && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome))
        ? CommonNewTab : ChromeNewTab;
  }
  (defaults as SettingsWithDefaults).newTabUrl = Build.MayOverrideNewTab && settings.CONST_.OverrideNewTab_
      ? obj.NtpNewTab_
      : (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome))
      ? IsEdg_ ? EdgNewTab : ChromeNewTab : CommonNewTab;
  // note: on firefox, "about:newtab/" is invalid, but it's OKay if still marking the URL a NewTab URL.
  ref3[CommonNewTab] = ref3[CommonNewTab + "/"] = Urls.NewTabType.browser;
  (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) ||
  (ref3[ChromeNewTab] = ref3[ChromeNewTab + "/"] = Urls.NewTabType.browser);
  if (Build.BTypes & BrowserType.Chrome && IsEdg_) {
    ref3[EdgNewTab] = ref3[EdgNewTab + "/"] = Urls.NewTabType.browser;
  }
  obj.GlobalCommands_ = (<Array<keyof ShortcutInfoMap | kShortcutAliases & string>> Object.keys(ref.commands || {})
      ).map(i => i === <string> <unknown> kShortcutAliases.nextTab1 ? kCName.nextTab : i);
  obj.VerCode_ = ref.version;
  obj.VerName_ = ref.version_name || ref.version;
  obj.OptionsPage_ = func(ref.options_page || obj.OptionsPage_);
  obj.AllowClipboardRead_ = ref.permissions != null && ref.permissions.indexOf("clipboardRead") >= 0;
  obj.ShowPage_ = func(obj.ShowPage_);
  obj.VomnibarPageInner_ = func(defaults.vomnibarPage);
  obj.VomnibarScript_f_ = func(obj.VomnibarScript_);
  obj.HomePage_ = ref.homepage_url || obj.HomePage_;
  obj.RedirectedUrls_.release += "#" + obj.VerCode_.replace(<RegExpG> /\D/g, "");
  obj.Injector_ = func(obj.Injector_);
  ref2.push(obj.InjectEnd_);
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith
      && CurCVer_ < BrowserVer.MinSafe$String$$StartsWith
      && "".includes.name !== "includes") {
    ref2.unshift(obj.PolyFill_);
  }
  obj.ContentScripts_ = ref2.map(func);

  payload_.g = settings.get_("grabBackFocus");
  type PayloadNames = keyof typeof valuesToLoad_;
  for (let _i in valuesToLoad_) {
    settings.updatePayload_(valuesToLoad_[_i as PayloadNames], settings.get_(_i as PayloadNames), payload_)
  }

  for (let oldKey in settings.legacyNames_) {
    let oldVal = settings.storage_.getItem(oldKey);
    if (oldVal != null) {
      settings.set_(settings.legacyNames_[oldKey as keyof typeof settings.legacyNames_], oldVal);
      settings.storage_.removeItem(oldKey);
    }
  }
  if (Build.MayOverrideNewTab) {
    if (settings.temp_.hasEmptyLocalStorage_) {
      settings.set_("newTabUrl", obj.NewTabForNewUser_);
    }
  }
  obj.StyleCacheId_ = obj.VerCode_ + ","
    + ( !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome
        ? CurCVer_ : Build.BTypes & BrowserType.Firefox ? CurFFVer_ : 0)
    + ( (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        ? ""
        : (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            ? window.ShadowRoot || (document.body as HTMLElement).webkitCreateShadowRoot : window.ShadowRoot)
        ? "s" : "")
    + (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinUsableCSS$All ? ""
      : (Build.MinCVer >= BrowserVer.MinUsableCSS$All || CurCVer_ > BrowserVer.MinUsableCSS$All - 1)
        && (!(Build.BTypes & BrowserType.Edge) || Build.BTypes & ~BrowserType.Edge && OnOther !== BrowserType.Edge
          || "all" in (document.documentElement as HTMLHtmlElement).style)
      ? "a" : "")
  const innerCSS = settings.storage_.getItem("innerCSS");
  if (innerCSS && innerCSS.startsWith(obj.StyleCacheId_ + ";")) {
    settings.postUpdate_("innerCSS", innerCSS);
    return;
  }
  settings.storage_.removeItem("vomnibarPage_f");
  settings.fetchFile_("baseCSS");
})();
