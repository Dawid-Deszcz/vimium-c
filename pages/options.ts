interface ElementWithHash extends HTMLElement {
  onclick (this: ElementWithHash, event: MouseEventToPrevent | null, hash?: "hash"): void;
}
interface ElementWithDelay extends HTMLElement {
  onclick (this: ElementWithDelay, event?: MouseEventToPrevent | null): void;
}
interface OptionWindow extends Window {
  _delayed: [string, MouseEventToPrevent | null];
}

Option_.syncToFrontend_ = [];

Option_.prototype._onCacheUpdated = function<T extends keyof SettingsNS.AutoSyncedNameMap
    > (this: Option_<T>, func: (this: Option_<T>) => void): void {
  func.call(this);
  if (window.VApi) {
    bgSettings_.updatePayload_(bgSettings_.valuesToLoad_[this.field_], this.readValueFromElement_() as any, VApi.z!)
  }
};

Option_.saveOptions_ = function (): boolean {
  const arr = Option_.all_, dirty: string[] = [];
  for (const i in arr) {
    const opt = arr[i as keyof AllowedOptions];
    if (!opt.saved_
        && !(opt as Option_<any>).areEqual_(opt.previous_, bgSettings_.get_(opt.field_))) {
      dirty.push(opt.field_);
    }
  }
  if (dirty.length > 0) {
    let ok = confirm(pTrans_("dirtyOptions", [dirty.join("\n  * ")]));
    if (!ok) {
      return false;
    }
  }
  for (const i in arr) {
    const opt = arr[i as keyof AllowedOptions];
    if (!opt.saved_ && !opt.allowToSave_()) {
      return false;
    }
  }
  arr.vimSync.saved_ || arr.vimSync.save_();
  arr.exclusionRules.saved_ || arr.exclusionRules.save_();
  for (const i in arr) {
    arr[i as keyof AllowedOptions].saved_ || arr[i as keyof AllowedOptions].save_();
  }
  return true;
};

Option_.needSaveOptions_ = function (): boolean {
  const arr = Option_.all_;
  for (const i in arr) {
    if (!arr[i as keyof AllowedOptions].saved_) {
      return true;
    }
  }
  return false;
};

Option_.prototype.areEqual_ = (a, b) => a === b;

interface NumberChecker extends Checker<"scrollStepSize"> {
  min: number | null;
  max: number | null;
  default: number;
  check_ (value: number): number;
}
type UniversalNumberSettings = Exclude<PossibleOptionNames<number>, "ignoreCapsLock" | "mapModifier">;
class NumberOption_<T extends UniversalNumberSettings> extends Option_<T> {
readonly element_: HTMLInputElement;
previous_: number;
wheelTime_: number;
checker_: NumberChecker;
constructor (element: HTMLInputElement, onUpdated: (this: NumberOption_<T>) => void) {
  super(element, onUpdated);
  let s: string, i: number;
  this.checker_ = {
    min: (s = element.min) && !isNaN(i = parseFloat(s)) ? i : null,
    max: (s = element.max) && !isNaN(i = parseFloat(s)) ? i : null,
    default: bgSettings_.defaults_[this.field_] as number,
    check_: NumberOption_.Check_
  };
  this.element_.oninput = this.onUpdated_;
  this.element_.onfocus = this.addWheelListener_.bind(this);
  this.element_.setAttribute("autocomplete", "off")
}
populateElement_ (value: number): void {
  this.element_.value = "" + value;
}
readValueFromElement_ (): number {
  return parseFloat(this.element_.value);
}
addWheelListener_ (): void {
  const el = this.element_, func = (e: WheelEvent): void => this.onWheel_(e as WheelEvent & ToPrevent),
  onBlur = (): void => {
    el.removeEventListener("wheel", func, {passive: false});
    el.removeEventListener("blur", onBlur);
    this.wheelTime_ = 0;
  };
  this.wheelTime_ = 0;
  el.addEventListener("wheel", func, {passive: false});
  el.addEventListener("blur", onBlur);
}
onWheel_ (event: WheelEvent & ToPrevent): void {
  event.preventDefault();
  const oldTime = this.wheelTime_;
  let i = Date.now(); // safe for time changes
  if (i - oldTime < 100 && i + 99 > oldTime && oldTime > 0) { return; }
  this.wheelTime_ = i;
  const el = this.element_, inc = (event.deltaY || event.deltaX) > 0, val0 = el.value;
  let val: string, func: undefined | ((n: string) => number) | (
        (this: HTMLInputElement, n?: number) => void) = inc ? el.stepUp : el.stepDown;
  if (typeof func === "function") {
    (func as (this: HTMLInputElement, n?: number) => void).call(el);
    val = el.value;
    el.value = val0;
  } else {
    func = parseFloat;
    let step = func(el.step) || 1;
    i = (+el.value || 0) + (inc ? step : -step);
    isNaN(step = func(el.max)) || (i = Math.min(i, step));
    isNaN(step = func(el.min)) || (i = Math.max(i, step));
    val = "" + i;
  }
  return this.atomicUpdate_(val, oldTime > 0, false);
}
static Check_ (this: NumberChecker, value: number): number {
  if (isNaN(value)) { value = this.default; }
  value = this.min != null ? Math.max(this.min, value) : value;
  return this.max != null ? Math.min(this.max, value) : value;
}
}

type TextualizedOptionNames = PossibleOptionNames<string | object>;
type TextOptionNames = PossibleOptionNames<string>;
class TextOption_<T extends TextualizedOptionNames> extends Option_<T> {
readonly element_: TextElement;
checker_?: Checker<T> & { ops_: string[], status_: 0 | 1 | 2 | 3 }
constructor (element: TextElement, onUpdated: (this: TextOption_<T>) => void) {
  super(element, onUpdated);
  const converter = this.element_.dataset.converter || "", ops = converter ? converter.split(" ") : [];
  this.element_.oninput = this.onUpdated_;
  if (ops.length > 0) {
    (this as any as TextOption_<TextOptionNames>).checker_ = {
      ops_: ops,
      status_: 0,
      check_: TextOption_.normalizeByOps_
    };
  }
  this.element_.setAttribute("autocomplete", "off")
}
fetch_ (): void {
  super.fetch_();
  const checker = (this as any as TextOption_<TextOptionNames>).checker_
  if (checker) {
    // allow old users to correct mistaken chars and save
    checker.status_ = 0
    checker.status_ = checker!.check_(this.previous_ as AllowedOptions[TextOptionNames]) === this.previous_
        ? 1 : 0
  }
}
populateElement_ (value: AllowedOptions[T] | string, enableUndo?: boolean): void {
  const value2 = (value as string).replace(<RegExpG> / /g, "\xa0");
  if (enableUndo !== true) {
    this.element_.value = value2;
  } else {
    this.atomicUpdate_(value2, true, true);
  }
}
readRaw_ (): string { return this.element_.value.trim().replace(<RegExpG> /\xa0/g, " ") }
/** @returns `string` in fact */
readValueFromElement_ (): AllowedOptions[T] {
  let value = this.readRaw_()
  const checker = (this as any as TextOption_<TextOptionNames>).checker_
  if (value && checker && checker.check_ === TextOption_.normalizeByOps_) {
    checker.status_ |= 2
    value = checker.check_(value)
    checker.status_ &= ~2
  }
  return value as AllowedOptions[T];
}
doesPopulateOnSave_ (val: any): boolean { return val !== this.readRaw_() }
static normalizeByOps_ (this: NonNullable<TextOption_<TextOptionNames>["checker_"]>, value: string): string {
  const ops = this.ops_
  ops.indexOf("lower") >= 0 ? value = value.toUpperCase().toLowerCase()
  : ops.indexOf("upper") >= 0 ? (value = value.toLowerCase().toUpperCase()) : 0
  value = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$String$$Normalize
      && !value.normalize ? value : value.normalize()
  if (ops.indexOf("chars") < 0 || this.status_ & 2 && !(this.status_ & 1)) {
    return value
  }
  let str2 = "";
  for (let ch of value.replace(<RegExpG> /\s/g, "")) {
    if (!str2.includes(ch)) {
      str2 += ch;
    }
  }
  return str2;
}
}

class NonEmptyTextOption_<T extends TextOptionNames> extends TextOption_<T> {
readValueFromElement_ (): string {
  let value = super.readValueFromElement_() as string;
  if (!value) {
    value = bgSettings_.defaults_[this.field_] as string;
    this.populateElement_(value, true);
  }
  return value;
}
}

TextOption_.prototype.atomicUpdate_ = NumberOption_.prototype.atomicUpdate_ = function<T extends keyof AllowedOptions
    >(this: Option_<T> & {element_: TextElement}, value: string
      , undo: boolean, locked: boolean): void {
  let newFocused = false
  if (undo) {
    this.locked_ = true;
    newFocused = document.activeElement !== this.element_
    newFocused && this.element_.focus()
    document.execCommand("undo");
  }
  this.locked_ = locked;
  this.element_.select();
  document.execCommand("insertText", false, value);
  if (!(Build.BTypes & ~BrowserType.Firefox)
      || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox) {
    if (this.element_.value !== value) {
      this.element_.value = value;
    }
  }
  newFocused && this.element_.blur()
  this.locked_ = false;
};

type JSONOptionNames = PossibleOptionNames<object>;
class JSONOption_<T extends JSONOptionNames> extends TextOption_<T> {
formatValue_ (obj: AllowedOptions[T]): string {
  const one = this.element_ instanceof HTMLInputElement, s0 = JSON.stringify(obj, null, one ? 1 : 2)
  return one ? s0.replace(<RegExpG & RegExpSearchable<1>> /(,?)\n\s*/g, (_, s) => s ? ", " : "") : s0
}
populateElement_ (obj: AllowedOptions[T], enableUndo?: boolean): void {
  super.populateElement_(this.formatValue_(obj), enableUndo);
}
doesPopulateOnSave_ (obj: any): boolean { return this.formatValue_(obj) !== this.readRaw_() }
readValueFromElement_ (): AllowedOptions[T] {
  let value = super.readValueFromElement_(), obj: AllowedOptions[T] = null as never;
  if (value) {
    try {
      obj = JSON.parse<AllowedOptions[T]>(value as AllowedOptions[T] & string);
    } catch {
    }
  } else {
    obj = bgSettings_.defaults_[this.field_];
    this.populateElement_(obj, true);
  }
  return obj;
}
}

class MaskedText_<T extends TextOptionNames> extends TextOption_<T> {
  masked_: boolean;
  _myCancelMask: (() => void) | null;
  constructor (element: TextElement, onUpdated: (this: TextOption_<T>) => void) {
    super(element, onUpdated);
    this.masked_ = true;
    nextTick_(() => {
      this.element_.classList.add("masked");
    });
    this._myCancelMask = this.cancelMask_.bind(this);
    (this.element_ as HTMLTextAreaElement).addEventListener("focus", this._myCancelMask);
  }
  cancelMask_ (): void {
    if (!this._myCancelMask) { return; }
    this.element_.removeEventListener("focus", this._myCancelMask);
    this.element_.classList.remove("masked");
    this._myCancelMask = null;
    this.masked_ = false;
    this.element_.removeAttribute("placeholder");
    this.fetch_();
  }
  populateElement_ (value: AllowedOptions[T], enableUndo?: boolean): void {
    if (this.masked_) {
      let s: string = this.element_.dataset.mask || "";
      s = pTrans_(s || "clickToUnmask") || s;
      s && (this.element_.placeholder = s);
      return;
    }
    super.populateElement_(value, enableUndo);
  }
  readValueFromElement_ (): AllowedOptions[T] {
    return this.masked_ ? this.previous_ : super.readValueFromElement_();
  }
}

(JSONOption_.prototype as JSONOption_<JSONOptionNames>).areEqual_ = Option_.areJSONEqual_;

class BooleanOption_<T extends keyof AllowedOptions> extends Option_<T> {
  readonly element_: HTMLInputElement;
  previous_: FullSettings[T];
  map_: any[];
  true_index_: 2 | 1;
  static readonly map_for_2_ = [false, true] as const;
  static readonly map_for_3_ = [false, null, true] as const;
  inner_status_: 0 | 1 | 2;
  constructor (element: HTMLInputElement, onUpdated: (this: BooleanOption_<T>) => void) {
    super(element, onUpdated);
    let map = element.dataset.map;
    this.map_ = map ? JSON.parse(map)
        : this.element_.dataset.allowNull ? BooleanOption_.map_for_3_ : BooleanOption_.map_for_2_;
    this.true_index_ = (this.map_.length - 1) as 2 | 1;
    if (this.true_index_ > 1 && this.field_ !== "vimSync") {
      this.element_.addEventListener("change", this.onTripleStatusesClicked.bind(this), true);
    }
    this.element_.onchange = this.onUpdated_;
  }
  populateElement_ (value: FullSettings[T]): void {
    this.element_.checked = value === this.map_[this.true_index_];
    this.element_.indeterminate = this.true_index_ > 1 && value === this.map_[1];
    this.inner_status_ = Math.max(0, this.map_.indexOf(value)) as 0 | 1 | 2;
  }
  readValueFromElement_ (): FullSettings[T] {
    let value = this.element_.indeterminate ? this.map_[1] : this.map_[this.element_.checked ? this.true_index_ : 0];
    return value;
  }
  onTripleStatusesClicked (event: Event): void {
    (event as EventToPrevent).preventDefault();
    const old = this.inner_status_;
    this.inner_status_ = old === 2 ? 1 : old ? 0 : 2;
    this.element_.indeterminate = old === 2;
    this.element_.checked = this.inner_status_ === 2;
  }
}

ExclusionRulesOption_.prototype.onRowChange_ = function (this: ExclusionRulesOption_, isAdd: number): void {
  if (this.list_.length !== isAdd) { return; }
  const el = $("#exclusionToolbar"), options = el.querySelectorAll("[data-model]");
  el.style.visibility = isAdd ? "" : "hidden";
  for (let i = 0, len = options.length; i < len; i++) {
    const opt = Option_.all_[options[i].id as keyof AllowedOptions],
    style = (opt.element_.parentNode as HTMLElement).style;
    style.visibility = isAdd || opt.saved_ ? "" : "visible";
    style.display = !isAdd && opt.saved_ ? "none" : "";
  }
};

TextOption_.prototype.showError_ = function<T extends TextualizedOptionNames>(this: TextOption_<T>
    , msg: string, tag?: OptionErrorType | null, errors?: boolean): void {
  errors != null || (errors = !!msg);
  const { element_: el, element_: { classList: cls, parentElement: par } } = this
  let errEl = el.nextElementSibling as HTMLElement | null;
  errEl = errEl && errEl.classList.contains("tip") ? errEl : null;
  nextTick_(() => {
  if (errors) {
    if (errEl == null) {
      errEl = document.createElement("div");
      errEl.className = "tip";
      (par as HTMLElement).insertBefore(errEl, el.nextElementSibling as Element | null);
    }
    errEl.textContent = msg;
    tag !== null && cls.add(tag || "has-error");
  } else {
    cls.remove("has-error"), cls.remove("highlight");
    errEl && errEl.remove();
  }
  });
};

setupBorderWidth_ && nextTick_(setupBorderWidth_);
nextTick_(versionEl => {
  const docCls = (document.documentElement as HTMLHtmlElement).classList;
  const kEventName = "DOMContentLoaded", onload = (): void => {
    removeEventListener(kEventName, onload);
    bgSettings_.payload_.d && docCls.add("auto-dark");
    bgSettings_.payload_.m && docCls.add("less-motion");
  };
  addEventListener(kEventName, onload);
  versionEl.textContent = bgSettings_.CONST_.VerName_;
}, $<HTMLElement>(".version"));

interface SaveBtn extends HTMLButtonElement {
  onclick (this: SaveBtn, virtually?: MouseEvent | false): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}
let optionsInit1_ = function (): void {
  const saveBtn = $<SaveBtn>("#saveOptions"), exportBtn = $<HTMLButtonElement>("#exportButton");
  let status = false;

  function onUpdated<T extends keyof AllowedOptions>(this: Option_<T>): void {
    if (this.locked_) { return; }
    if (this.saved_ = this.areEqual_(this.readValueFromElement_(), this.previous_)) {
      if (status && !Option_.needSaveOptions_()) {
        if (Build.BTypes & BrowserType.Firefox
            && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
          saveBtn.blur();
        }
        saveBtn.disabled = true;
        (saveBtn.firstChild as Text).data = pTrans_("o115");
        exportBtn.disabled = false;
        status = false;
        window.onbeforeunload = null as never;
      }
      return;
    } else if (status) {
      return;
    }
    window.onbeforeunload = onBeforeUnload;
    status = true;
    saveBtn.disabled = false;
    (saveBtn.firstChild as Text).data = pTrans_("o115_2");
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      exportBtn.blur();
    }
    exportBtn.disabled = true;
  }

  saveBtn.onclick = function (virtually): void {
    if (virtually !== false) {
      if (!Option_.saveOptions_()) {
        return;
      }
    }
    const toSync = Option_.syncToFrontend_;
    Option_.syncToFrontend_ = [];
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      this.blur();
    }
    this.disabled = true;
    (this.firstChild as Text).data = pTrans_("o115_3");
    exportBtn.disabled = false;
    status = false;
    window.onbeforeunload = null as never;
    if (toSync.length === 0) { return; }
    setTimeout(doSyncToFrontend, 100, toSync);
  };
  function doSyncToFrontend(toSync: typeof Option_.syncToFrontend_): void {
    bgSettings_.broadcast_({ N: kBgReq.settingsUpdate, d: toSync.map(key => bgSettings_.valuesToLoad_[key]) });
  }

  let advancedMode = false, _element: HTMLElement = $<AdvancedOptBtn>("#advancedOptionsButton");
  (_element as AdvancedOptBtn).onclick = function (this: AdvancedOptBtn, _0, init): void {
    if (init == null || (init === "hash" && bgSettings_.get_("showAdvancedOptions") === false)) {
      advancedMode = !advancedMode;
      bgSettings_.set_("showAdvancedOptions", advancedMode);
    } else {
      advancedMode = bgSettings_.get_("showAdvancedOptions");
    }
    const el = $("#advancedOptions");
    nextTick_((): void => {
    (el.previousElementSibling as HTMLElement).style.display = el.style.display = advancedMode ? "" : "none";
    let s = advancedMode ? "Hide" : "Show";
    (this.firstChild as Text).data = pTrans_(s) || s;
    this.setAttribute("aria-checked", "" + advancedMode);
    }, 9);
  };
  (_element as AdvancedOptBtn).onclick(null, true);

  if (Build.MayOverrideNewTab && bgSettings_.CONST_.OverrideNewTab_) {
    $("#focusNewTabContent").dataset.model = "Boolean";
    nextTick_(box => box.style.display = "", $("#focusNewTabContentBox"));
    nextTick_(([el1, el2]) => el2.previousElementSibling !== el1 && el2.parentElement.insertBefore(el1, el2)
      , [$<HTMLElement>("#newTabUrlBox"), $<EnsuredMountedHTMLElement>("searchUrlBox")] as const);
  }
  if (!Build.NoDialogUI && bgSettings_.CONST_.OptionsUIOpenInTab_) {
    $("#dialogMode").dataset.model = "Boolean";
    nextTick_(box => box.style.display = "", $("#dialogModeBox"));
  }

  let _ref: { length: number; [index: number]: HTMLElement } = $$("[data-model]");
  const types = {
    Number: NumberOption_,
    Text: TextOption_,
    NonEmptyText: NonEmptyTextOption_,
    JSON: JSONOption_,
    MaskedText: MaskedText_,
    Boolean: BooleanOption_,
    ExclusionRules: ExclusionRulesOption_
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    _element = _ref[_i];
    const cls = types[_element.dataset.model as "Text"];
    const instance = new cls(_element as TextElement, onUpdated);
    instance.fetch_();
    (Option_.all_ as any as SafeDict<Option_<keyof AllowedOptions>>)[instance.field_] = instance as any;
  }
  nextTick_(() => {
    const ref = Option_.all_;
    Option_.suppressPopulate_ = false;
    for (let key in ref) {
      const obj = ref[key as "vimSync"];
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ & BrowserType.Firefox)
          && bgSettings_.payload_.o === kOS.unixLike && obj instanceof BooleanOption_) {
        obj.element_.classList.add("text-bottom");
      }
      obj.populateElement_(obj.previous_);
    }
  });
  if (Option_.all_.exclusionRules.previous_.length > 0) {
    nextTick_(el => {
      el.style.visibility = "";
    }, $("#exclusionToolbar"));
  }

  _ref = $$("[data-check]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _element = _ref[_i];
    _element.addEventListener(_element.dataset.check || "input", loadChecker);
  }

  document.addEventListener("keyup", function (this: void, event): void {
    const el = event.target as Element, i = event.keyCode;
    if (i !== kKeyCode.enter) {
      if (i !== kKeyCode.space) { return; }
      if (el instanceof HTMLSpanElement && el.parentElement instanceof HTMLLabelElement) {
        event.preventDefault();
        click(el.parentElement.control as HTMLElement);
      }
      return;
    }
    if (el instanceof HTMLAnchorElement) {
      el.hasAttribute("href") || setTimeout(function (el1) {
        click(el1);
        el1.blur();
      }, 0, el);
    } else if (event.ctrlKey || event.metaKey) {
      el.blur && el.blur();
      if (status) {
        return saveBtn.onclick();
      }
    }
  });

  let func: {
    (this: HTMLElement, event: MouseEventToPrevent): void;
  } | ElementWithDelay["onclick"] = function (this: HTMLElement): void {
    const target = $("#" + <string> this.dataset.autoResize);
    let height = target.scrollHeight, width = target.scrollWidth, dw = width - target.clientWidth;
    if (height <= target.clientHeight && dw <= 0) { return; }
    const maxWidth = Math.max(Math.min(innerWidth, 1024) - 120, 550);
    target.style.maxWidth = width > maxWidth ? maxWidth + "px" : "";
    target.style.height = target.style.width = "";
    dw = width - target.clientWidth;
    let delta = target.offsetHeight - target.clientHeight;
    delta = dw > 0 ? Math.max(26, delta) : delta + 18;
    height += delta;
    if (dw > 0) {
      target.style.width = target.offsetWidth + dw + 4 + "px";
    }
    target.style.height = height + "px";
  };
  _ref = $$("[data-auto-resize]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  func = function (event): void {
    let str = this.dataset.delay as string, e = null as MouseEventToPrevent | null;
    if (str !== "continue") {
      event && event.preventDefault();
    }
    if (str === "event") { e = event || null; }
    (window as OptionWindow)._delayed = ["#" + this.id, e];
    if (document.readyState === "complete") {
      loadJS("options_ext.js");
      return;
    }
    window.addEventListener("load", function onLoad(event1): void {
      if (event1.target === document) {
        window.removeEventListener("load", onLoad);
        loadJS("options_ext.js");
      }
    });
  } as ElementWithDelay["onclick"];
  _ref = $$("[data-delay]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredWebkitUserSelectAll
      && bgBrowserVer_ < BrowserVer.MinEnsuredWebkitUserSelectAll) {
  _ref = $$(".sel-all");
  func = function (this: HTMLElement, event): void {
    if (event.target !== this) { return; }
    event.preventDefault();
    getSelection().selectAllChildren(this);
  } as ElementWithDelay["onmousedown"];
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onmousedown = func;
  }
  }

  let setUI = function (curTabId: number | null): void {
    const ratio = BG_.devicePixelRatio, element2 = document.getElementById("openInTab") as HTMLAnchorElement;
    const mainHeader = document.getElementById("mainHeader") as HTMLElement;
    element2.onclick = function (this: HTMLAnchorElement): void {
      setTimeout(window.close, 17);
    };
    nextTick_(() => {
    (document.body as HTMLBodyElement).classList.add("dialog-ui");
    mainHeader.remove();
    element2.style.display = "";
    (element2.nextElementSibling as SafeHTMLElement).style.display = "none";
    });
    if (Build.MinCVer >= BrowserVer.MinCorrectBoxWidthForOptionsUI
        || !(Build.BTypes & BrowserType.Chrome)
        || bgBrowserVer_ >= BrowserVer.MinCorrectBoxWidthForOptionsUI) { return; }
    ratio > 1 && ((document.body as HTMLBodyElement).style.width = 910 / ratio + "px");
    ( !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$Tabs$$getZoom)
      || Build.BTypes & BrowserType.ChromeOrFirefox && chrome.tabs.getZoom) &&
    chrome.tabs.getZoom(curTabId, function (zoom): void {
      if (!zoom) { return chrome.runtime.lastError; }
      const ratio2 = Math.round(devicePixelRatio / zoom * 1024) / 1024;
      (document.body as HTMLBodyElement).style.width = ratio2 !== 1 ? 910 / ratio2 + "px" : "";
    });
  },
  opt: Option_<"keyMappings"> | Option_<"filterLinkHints"> | Option_<"vomnibarPage"> | Option_<"ignoreKeyboardLayout">;
  if (Build.NoDialogUI) { /* empty */ }
  else if (location.hash.toLowerCase() === "#dialog-ui") {
    setUI(null);
    setUI = null as never;
  } else if (chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs): void {
      let url: string;
      if (tabs[0] && (<RegExpOne> /^(about|chrome|edge):/).test(url = tabs[0].url)
          && !url.startsWith(location.protocol)) {
        setUI(tabs[0].id);
      }
      setUI = null as never;
    });
  }
  opt = Option_.all_.keyMappings;
  opt.onSave_ = function (): void {
    const bgCommandsData_ = BG_.CommandsData_ as CommandsDataTy
    const errors = bgCommandsData_.errors_,
    msg = errors ? formatCmdErrors_(errors) : "";
    if (bgSettings_.payload_.l && !msg) {
      let str = Object.keys(bgCommandsData_.keyFSM_).join(""), mapKey = bgCommandsData_.mappedKeyRegistry_;
      str += mapKey ? Object.keys(mapKey).join("") : "";
      if ((<RegExpOne> /[^ -\xff]/).test(str)) {
        this.showError_(pTrans_("ignoredNonEN"), null);
        return;
      }
    }
    this.showError_(msg);
  };
  opt.onSave_();

  let optChars = Option_.all_.linkHintCharacters, optNums = Option_.all_.linkHintNumbers,
  optFilter = Option_.all_.filterLinkHints;
  opt = optFilter;
  optChars.onSave_ = optNums.onSave_ = function (this: Option_<"linkHintCharacters" | "linkHintNumbers">): void {
    this.showError_(!this.element_.style.display && this.previous_.length < GlobalConsts.MinHintCharSetSize
        ? pTrans_("" + kTip.fewChars) : "");
  };
  opt.onSave_ = function (): void {
    nextTick_(el => {
      const enableFilterLinkHints = optFilter.readValueFromElement_();
      el.style.display = optNums.element_.style.display = enableFilterLinkHints ? "" : "none";
      optChars.element_.style.display = enableFilterLinkHints ? "none" : "";
      optChars.onSave_();
      optNums.onSave_();
    }, $<HTMLElement>("#waitForEnterBox"));
  };
  opt.onSave_();
  opt.element_.addEventListener("change", opt.onSave_.bind(opt), true);

  opt = Option_.all_.vomnibarPage;
  opt.onSave_ = function (this: Option_<"vomnibarPage">): void {
    let {element_: element2} = this, url: string = this.previous_
      , isExtPage = url.startsWith(location.protocol) || url.startsWith("front/");
    if (Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
        && Build.BTypes & BrowserType.Chrome
        && bgBrowserVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) {
      nextTick_(() => {
        element2.style.textDecoration = isExtPage ? "" : "line-through";
      });
      return this.showError_(
        url === bgSettings_.defaults_.vomnibarPage ? ""
          : pTrans_("onlyExtVomnibar", [BrowserVer.Min$tabs$$executeScript$hasFrameIdArg]),
        null);
    }
    url = bgSettings_.cache_.vomnibarPage_f || url; // for the case Chrome is initing
    if (isExtPage) { /* empty */ }
    // Note: the old code here thought on Firefox web pages couldn't be used, but it was just because of wrappedJSObject
    else if (url.startsWith("file:")) {
      return this.showError_(pTrans_("fileVomnibar"), "highlight");
    } else if ((<RegExpI> /^http:\/\/(?!localhost[:/])/i).test(url)) {
      return this.showError_(pTrans_("httpVomnibar"), "highlight");
    }
    return this.showError_("");
  };
  opt.onSave_();

  _ref = $$("[data-permission]");
  _ref.length > 0 && ((els: typeof _ref): void => {
    const manifest = chrome.runtime.getManifest();
    for (const key of manifest.permissions || []) {
      manifest[key] = true;
    }
    for (let i = els.length; 0 <= --i; ) {
      let el: HTMLElement = els[i];
      let key = el.dataset.permission as string;
      if (key[0] === "C") {
        if (!(Build.BTypes & BrowserType.Chrome)
            || Build.BTypes & ~BrowserType.Chrome && bgOnOther_ !== BrowserType.Chrome) {
          if (key === "C") { // hide directly
            nextTick_(parentEl => {
              parentEl.style.display = "none";
            }, (el as EnsuredMountedHTMLElement).parentElement.parentElement.parentElement);
          }
          continue;
        } else if (bgBrowserVer_ >= +key.slice(1)) {
          continue;
        }
        key = pTrans_("beforeChromium", [key.slice(1)]);
      } else {
        if (key in manifest) { continue; }
        key = pTrans_("lackPermission", [key ? ":\n* " + key : ""]);
      }
      key = pTrans_("invalidOption", [key]);
      nextTick_(el1 => {
        (el1 as TextElement).disabled = true;
        if (el1 instanceof HTMLInputElement && el1.type === "checkbox") {
          (el1 as SafeHTMLElement as EnsuredMountedHTMLElement).nextElementSibling.tabIndex = -1;
          el1 = el1.parentElement as HTMLElement;
          el1.title = key;
        } else {
          (el1 as TextElement).value = "";
          el1.title = key;
          (el1.parentElement as HTMLElement).onclick = onclick;
        }
      }, el);
    }
    function onclick(this: HTMLElement): void {
      const el = this.querySelector("[data-permission]") as TextElement | null;
      this.onclick = null as never;
      if (!el) { return; }
      const key = el.dataset.permission;
      el.placeholder = pTrans_("lackPermission", [key ? `: "${key}"` : ""]);
    }
  })(_ref);
  if (BG_.Settings_.CONST_.GlobalCommands_.length === 0) {
    nextTick_(ref2 => {
      for (let _i = ref2.length; 0 <= --_i; ) {
        ref2[_i].remove();
      }
    }, $$(".require-shortcuts"));
  }
  if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || bgOnOther_ === BrowserType.Edge)) {
    nextTick_(tipForNoShadow => {
      tipForNoShadow.innerHTML = '(On Edge, may need "<kbd>#VimiumUI</kbd>" as prefix if no Shadow DOM)';
    }, $("#tipForNoShadow"));
  }

  nextTick_(ref2 => {
  for (let _i = ref2.length; 0 <= --_i; ) {
    const element = ref2[_i] as HTMLInputElement;
    let str = element.dataset.href as string;
    str = BG_.BgUtils_.convertToUrl_(str, null, Urls.WorkType.ConvertKnown);
    element.removeAttribute("data-href");
    element.setAttribute("href", str);
  }
  }, $$("[data-href]"));

  function onBeforeUnload(): string {
    return pTrans_("beforeUnload");
  }

  _element = $<HTMLAnchorElement>("#openExtensionsPage");
  if (Build.MinCVer < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts
      && Build.BTypes & BrowserType.Chrome
      && bgBrowserVer_ < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    (_element as HTMLAnchorElement).href = "chrome://extensions/configureCommands";
  } else if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
    nextTick_(([el, el2, el3]) => {
      el.textContent = el.href = "about:addons";
      const el1 = el.parentElement as HTMLElement, prefix = GlobalConsts.FirefoxAddonPrefix;
      el1.insertBefore(new Text(pTrans_("manageShortcut")), el); // lgtm [js/superfluous-trailing-arguments]
      el1.insertBefore(new Text(pTrans_("manageShortcut_2")) // lgtm [js/superfluous-trailing-arguments]
          , el.nextSibling);
      el2.href = prefix + "shortcut-forwarding-tool/?src=external-vc-options";
      el3.href = prefix + "newtab-adapter/?src=external-vc-options";
    }, [_element as HTMLAnchorElement,
        $<HTMLAnchorElement>("#shortcutHelper"), $<HTMLAnchorElement>("#newTabAdapter")] as const);
  }
  (_element as HTMLAnchorElement).onclick = function (event): void {
    event.preventDefault();
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      window.VApi ? VApi.t({ k: kTip.haveToOpenManually }) : alert(pTrans_("" + kTip.haveToOpenManually));
    } else {
      BG_.Backend_.reqH_[kFgReq.focusOrLaunch]({ u: this.href, r: ReuseType.reuse, p: true })
    }
  };

  if (Build.BTypes & BrowserType.ChromeOrFirefox
      && (!(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
          || (bgOnOther_ & BrowserType.ChromeOrFirefox))) {
    nextTick_(el => {
      const children = el.children, anchor = children[1] as HTMLAnchorElement, name = pTrans_("NewTabAdapter");
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
        children[0].textContent = "moz";
        anchor.textContent = name;
        anchor.href = GlobalConsts.FirefoxAddonPrefix + "newtab-adapter/?src=external-vc-options_omni";
      }
      anchor.title = name + " - " + pTrans_(Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox) ? "addons" : "webstore");
    }, $("#chromeExtVomnibar"));
  }

  _ref = $$(".ref-text");
  const updateRefStat = function (this: BooleanOption_<PossibleOptionNames<boolean>>): void {
    nextTick_(ref2 => {
      ref2.textContent = pTrans_(this.previous_ ? "o145_2" : "o144");
    }, $(`#${this.element_.id}Status`));
  },
  onRefStatClick = function (this: HTMLElement, event: MouseEventToPrevent): void {
    if (!advancedMode) {
      $<AdvancedOptBtn>("#advancedOptionsButton").onclick(null);
    }
    event.preventDefault();
    const node2 = Option_.all_[this.getAttribute("for") as "ignoreKeyboardLayout"
        ].element_.nextElementSibling as SafeHTMLElement;
    {
      Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
        && bgBrowserVer_ < BrowserVer.MinScrollIntoViewOptions
      ? node2.scrollIntoViewIfNeeded!()
      : node2.scrollIntoView({ block: "center" });
      node2.focus();
    }
    if (window.VApi) {
      VApi.x((node2 as EnsuredMountedHTMLElement).parentElement.parentElement);
    }
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    opt = Option_.all_[ _ref[_i].getAttribute("for"
        ) as string as PossibleOptionNames<boolean> as "ignoreKeyboardLayout"];
    opt.onSave_ = updateRefStat;
    opt.onSave_();
    _ref[_i].onclick = onRefStatClick;
  }
},
optionsInitAll_ = function (): void {

optionsInit1_();

if (!bgSettings_.payload_.o) {
  nextTick_(el => { el.textContent = "Cmd"; }, $("#Ctrl"));
}

const newTabUrlOption = Option_.all_.newTabUrl;
newTabUrlOption.checker_ = {
  check_ (value: string): string {
    let url = (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(value)
        ? chrome.runtime.getURL(value) : BG_.BgUtils_.convertToUrl_(value.toLowerCase());
    url = url.split("?", 1)[0].split("#", 1)[0];
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox) {
      let err = "";
      if ((<RegExpI> /^chrome|^(javascript|data|file):|^about:(?!(newtab|blank)\/?$)/i).test(url)) {
        err = pTrans_("refusedURLs", [url]);
        console.log("newTabUrl checker:", err);
      }
      Option_.all_.newTabUrl.showError_(err);
    }
    return !value.startsWith("http") && (url in bgSettings_.newTabs_
      || (<RegExpI> /^(?!http|ftp)[a-z\-]+:\/?\/?newtab\b\/?/i).test(value)
      ) ? bgSettings_.defaults_.newTabUrl : value;
  }
};
newTabUrlOption.checker_.check_(newTabUrlOption.previous_);

const ignoreKeyboardLayoutOption = Option_.all_.ignoreKeyboardLayout;
ignoreKeyboardLayoutOption.onSave_ = function (): void {
  nextTick_(el => {
    el.style.display = ignoreKeyboardLayoutOption.readValueFromElement_() ? "none" : "";
  }, $<HTMLElement>("#ignoreCapsLockBox"));
};
ignoreKeyboardLayoutOption.onSave_();
ignoreKeyboardLayoutOption.element_.addEventListener("change",
    ignoreKeyboardLayoutOption.onSave_.bind(ignoreKeyboardLayoutOption), true);

Option_.all_.userDefinedCss.onSave_ = function () {
  if (!window.VApi || !VApi.z) { return; }
  if (!this.element_.classList.contains("debugging")) { return; }
  setTimeout(function () {
    const root = VApi.y().r;
    const iframes = root!.querySelectorAll("iframe");
    for (let i = 0, end = iframes.length; i < end; i++) {
      const frame = iframes[i], isFind = frame.classList.contains("HUD"),
      doc = frame.contentDocument as HTMLDocument,
      style = doc.querySelector("style.debugged") as HTMLStyleElement | null;
      if (!style) { /* empty */ }
      else if (isFind) {
        style.remove();
      } else {
        style.classList.remove("debugged");
      }
    }
    Option_.all_.userDefinedCss.element_.classList.remove("debugging");
  }, 500);
};

const autoDarkMode = Option_.all_.autoDarkMode, autoReduceMotion = Option_.all_.autoReduceMotion;
autoDarkMode.onSave_ = function (): void {
  (document.documentElement as HTMLHtmlElement).classList.toggle("auto-dark", this.previous_);
};
autoReduceMotion.onSave_ = function (): void {
  (document.documentElement as HTMLHtmlElement).classList.toggle("less-motion", this.previous_);
};
autoDarkMode.onSave_()
autoReduceMotion.onSave_();

(Option_.all_.exclusionRules as ExclusionRulesOption_).onInited_ = onExclusionRulesInited;

optionsInit1_ = optionsInitAll_ = null as never;
(window.onhashchange as () => void)();

if (Build.BTypes & BrowserType.ChromeOrFirefox
    && (Build.BTypes & BrowserType.Chrome && bgBrowserVer_ > BrowserVer.MinMediaQuery$PrefersColorScheme
      || Build.BTypes & BrowserType.Firefox && BG_.CurFFVer_ > FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme
      )) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.onchange = function (): void {
    bgSettings_.updateMediaQueries_();
    useLocalStyle()
    setTimeout(useLocalStyle, 34)
  }
  const useLocalStyle = () => {
    const darkOpt = Option_.all_.autoDarkMode
    if (darkOpt.previous_ && darkOpt.saved_ && window.VApi && VApi.z) {
      const val = media.matches
      const root = VApi.y().r, hud_box = root && root.querySelector(".HUD:not(.UI)")
      bgSettings_.updatePayload_("d", val, VApi.z)
      hud_box && hud_box.classList.toggle("D", val);
    }
  }
  // As https://bugzilla.mozilla.org/show_bug.cgi?id=1550804 said, to simulate color schemes, enable
  // https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features#Color_scheme_simulation
  setTimeout(useLocalStyle, 800)
}

if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && bgOnOther_ & BrowserType.Firefox) {
  setTimeout((): void => {
    const test = document.createElement("div")
    test.style.display = "none"
    test.style.color = "#543";
    (document.body as HTMLBodyElement).append!(test)
    requestIdleCallback!((): void => {
      const K = GlobalConsts.kIsHighContrast, storage = localStorage
      const newColor = (getComputedStyle(test).color || "").replace(<RegExpG> / /g, '').toLowerCase()
      const isHC = !!newColor && newColor != "rgb(85,68,51)"
      test.remove()
      const oldIsHC = storage.getItem(K) == "1"
      if (isHC != oldIsHC) {
        isHC ? storage.setItem(K, "1") : storage.removeItem(K);
        delete (bgSettings_.cache_ as Partial<SettingsNS.FullCache>).helpDialog
        bgSettings_.reloadCSS_(2)
      }
    }, { timeout: 1e3 })
  }, 34)
}
};

function onExclusionRulesInited(this: ExclusionRulesOption_): void {
const exclusionRules = this, table = exclusionRules.$list_;
table.ondragstart = event => {
  let dragged = exclusionRules.dragged_ = event.target as HTMLTableRowElement;
  dragged.style.opacity = "0.5";
  if (!(Build.BTypes & ~BrowserType.Firefox)
      || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox) {
    event.dataTransfer.setData("text/plain", "");
  }
};
table.ondragend = () => {
  const dragged = exclusionRules.dragged_;
  exclusionRules.dragged_ = null;
  dragged && (dragged.style.opacity = "");
};
table.ondragover = event => event.preventDefault();
table.ondrop = event => {
  event.preventDefault();
  const dragged = exclusionRules.dragged_;
  let target: Element | null = event.target as Element;
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest) {
    while (target && target.classList.contains("exclusionRule")) {
      target = target.parentElement as SafeHTMLElement | null;
    }
  } else {
    target = target.closest!(".exclusionRule");
  }
  if (!dragged || !target || dragged === target) { return; }
  exclusionRules.$list_.insertBefore(dragged, target);
  const list = exclusionRules.list_, srcNode = (dragged.querySelector(".pattern") as ExclusionRealNode).vnode,
  targetNode = (target.querySelector(".pattern") as ExclusionRealNode).vnode;
  list.splice(list.indexOf(srcNode), 1);
  list.splice(list.indexOf(targetNode), 0, srcNode);
  exclusionRules.onUpdated_();
};
}

$("#userDefinedCss").addEventListener("input", debounce_(function (): void {
  const self = Option_.all_.userDefinedCss
  const isDebugging = self.element_.classList.contains("debugging")
  if (self.saved_ && !isDebugging || !window.VApi || !VApi.z) { return }
  const newVal = self.readValueFromElement_(), isSame = newVal === self.previous_,
  css = bgSettings_.reloadCSS_(-1, newVal)!, misc = VApi.y(), root = misc.r
  if (!isDebugging && BG_) {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs?: [chrome.tabs.Tab?]): void => {
      if (tabs && tabs[0] && tabs[0].url === location.href) {
        const port = BG_.Backend_.indexPorts_(tabs[0].id, 0) as Frames.Port | null
        port && (port.s.f |= Frames.Flags.hasCSS | Frames.Flags.hasFindCSS)
      }
    })
  }
  self.element_.classList.toggle("debugging", !isSame)
  VApi.t({
    k: root || isSame ? 0 : kTip.raw, t: "Debugging CSS\u2026",
    H: css.ui, f: css.find
  })
  const frame = root && root.querySelector("iframe.Omnibar") as HTMLIFrameElement | null
  const doc = frame && frame.contentDocument
  if (doc) {
    let styleDebug = doc.querySelector("style.debugged") || doc.querySelector("style#custom")
    if (!styleDebug) {
      /** should keep the same as {@link ../front/vomnibar#Vomnibar_.css_} */
      (styleDebug = doc.createElement("style")).type = "text/css"
      styleDebug.id = "custom"
    }
    styleDebug.parentNode || (doc.head as HTMLHeadElement).appendChild(styleDebug)
    styleDebug.classList.add("debugged")
    styleDebug.textContent = (isSame ? "\n" : "\n.transparent { opacity: 1; }\n") + (css.omni && css.omni + "\n" || "")
  }
}, 1200, $("#userDefinedCss") as HTMLTextAreaElement, 0));

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Option$HasReliableFontSize
    && bgBrowserVer_ < BrowserVer.Min$Option$HasReliableFontSize) {
  $("select").classList.add("font-fix");
}

$("#importButton").onclick = function (): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? opt.onchange(null as never) : click($("#settingsFile"));
};

nextTick_(el0 => {
const platform = bgSettings_.CONST_.Platform_;
el0.textContent = (Build.BTypes & BrowserType.Edge
        && (!(Build.BTypes & ~BrowserType.Edge) || bgOnOther_ === BrowserType.Edge)
    ? "MS Edge (EdgeHTML)"
    : Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)
    ? "Firefox " + BG_.CurFFVer_
    : (BG_.IsEdg_ ? ["MS Edge"]
        : (<RegExpOne> /\bChromium\b/).exec(navigator.appVersion) || ["Chrome"])[0] + " " + bgBrowserVer_
  ) + pTrans_("comma") + (pTrans_(platform)
        || platform[0].toUpperCase() + platform.slice(1));
if (Build.BTypes & BrowserType.Chrome && BG_.IsEdg_) {
  const a = $<HTMLAnchorElement>("#openExtensionsPage");
  a.textContent = a.href = "edge://extensions/shortcuts";
}
}, $("#browserName"));

function loadJS(file: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = file;
  script.async = false; script.defer = true;
  (document.head as HTMLHeadElement).appendChild(script);
  return script;
}

interface CheckerLoader { info_?: string }
function loadChecker(this: HTMLElement): void {
  if ((loadChecker as CheckerLoader).info_ != null) { return; }
  (loadChecker as CheckerLoader).info_ = this.id;
  loadJS("options_checker.js");
}

document.addEventListener("keydown", function (this: void, event): void {
  if (event.keyCode !== kKeyCode.space) {
    if (!window.VApi || !VApi.z || "input textarea".includes(document.activeElement!.localName as string)) { return; }
    const key = VApi.m({c: kChar.INVALID, e: event, i: event.keyCode}, kModeId.NO_MAP_KEY)
    if (key === "a-" + kChar.f12) {
      let el2 = $<HTMLSelectElement>("#importOptions");
      const oldSelected = el2.selectedIndex, callback = (): void => {
        el2.onchange && (el2 as any).onchange()
        el2.selectedIndex = oldSelected
      }
      $<HTMLOptionElement>("#recommendedSettings").selected = true;
      el2.onchange != null ? callback() : setTimeout(callback, 100) && el2.click()
    }
    else if (key === "?") {
      if (!Build.NDEBUG) {
        console.log('The document receives a "?" key which has been passed (excluded) by Vimium C,',
          "so open the help dialog.");
      }
      $("#showCommands").click();
    }
    return;
  }
  const el = event.target as Element;
  if (el.localName === "span" && (el as EnsuredMountedHTMLElement).parentElement.localName === "label") {
    event.preventDefault();
  }
});

window.onhashchange = function (this: void): void {
  let hash = location.hash, node: HTMLElement | null;
  hash = hash.slice(hash[1] === "!" ? 2 : 1);
  if (Build.MayOverrideNewTab
      && !hash && Option_.all_.newTabUrl.previous_ === bgSettings_.CONST_.NewTabForNewUser_) {
    hash = "newTabUrl";
  }
  if (!hash || !(<RegExpI> /^[a-z][a-z\d_-]*$/i).test(hash)) { return; }
  if (node = $(`[data-hash="${hash}"]`) as HTMLElement | null) {
    if (node.onclick) {
      nextTick_(() => {
        (node as ElementWithHash).onclick(null, "hash");
      });
    }
  } else if (node = $("#" + hash)) {
    nextTick_((): void => {
    if ((node as HTMLElement).dataset.model) {
      (node as HTMLElement).classList.add("highlight");
    }
    const callback = function (event?: Event): void {
      if (event && event.target !== window) { return; }
      if (window.onload) {
        window.onload = null as never;
        window.scrollTo(0, 0);
      }
      const node2 = node as Element;
      Build.BTypes & BrowserType.Chrome ? node2.scrollIntoViewIfNeeded!() : node2.scrollIntoView();
    };
    if (document.readyState === "complete") { return callback(); }
    window.scrollTo(0, 0);
    window.onload = callback;
    });
  }
};

bgSettings_.restore_ && bgSettings_.restore_() ? (
  Build.NDEBUG || console.log("Now restore settings before page loading"),
  bgSettings_.restore_()!.then(optionsInitAll_)
) : optionsInitAll_();

// below is for programmer debugging
window.onunload = function (): void {
  BG_.removeEventListener("unload", OnBgUnload);
  BG_.BgUtils_.GC_(-1);
};
BG_.BgUtils_.GC_(1);

function OnBgUnload(): void {
  BG_.removeEventListener("unload", OnBgUnload);
  setTimeout(function (): void {
    BG_ = chrome.extension.getBackgroundPage() as Window as typeof BG_ // lgtm [js/missing-variable-declaration]
    if (!BG_) { // a user may call `close()` in the console panel
      window.onbeforeunload = null as any;
      window.close();
      return;
    }
    bgSettings_ = BG_.Settings_ // lgtm [js/missing-variable-declaration]
    if (!bgSettings_) { BG_ = null as never; return; }
    BG_.addEventListener("unload", OnBgUnload);
    if (BG_.document.readyState !== "loading") { setTimeout(callback, 67); return; }
    BG_.addEventListener("DOMContentLoaded", function load(): void {
      BG_.removeEventListener("DOMContentLoaded", load, true);
      setTimeout(callback, 100);
    }, true);
  }, 200);
  function callback(): void {
    const ref = Option_.all_;
    for (const key in ref) {
      const opt = ref[key as keyof AllowedOptions], { previous_: previous } = opt;
      if (typeof previous === "object" && previous) {
        opt.previous_ = bgSettings_.get_(opt.field_);
      }
    }
    let needCommands = false
    if ((Option_.all_.exclusionRules as ExclusionRulesOption_).list_.length || Option_.all_.keyMappings.checker_) {
      needCommands = true
    }
    needCommands && !BG_.KeyMappings && BG_.BgUtils_.require_("KeyMappings");
    BG_.BgUtils_.GC_(1);
  }
}
BG_.addEventListener("unload", OnBgUnload);

const cmdRegistry = (BG_.CommandsData_ as CommandsDataTy).keyToCommandRegistry_["?"]
if (!cmdRegistry || cmdRegistry.alias_ !== kBgCmd.showHelp) { (function (): void {
  const arr = (BG_.CommandsData_ as CommandsDataTy).keyToCommandRegistry_
  let matched = "";
  for (let key in arr) {
    const item = arr[key] as CommandsNS.Item;
    if (item.alias_ === kBgCmd.showHelp) {
      matched = matched && matched.length < key.length ? matched : key;
    }
  }
  if (matched) {
    nextTick_(el => el.textContent = matched, $("#questionShortcut"));
  }
})(); }

document.addEventListener("click", function onClickOnce(): void {
  const api = window.VApi, misc = api && api.y()
  if (!misc || !misc.r) { return; }
  document.removeEventListener("click", onClickOnce, true);
  misc.r.addEventListener("click", function (event): void {
    let target = event.target as HTMLElement, str: string;
    if (VApi && target.classList.contains("HelpCommandName")) {
      str = target.textContent.slice(1, -1);
      VApi.p({
        H: kFgReq.copy,
        s: str
      });
    }
  }, true);
}, true);

function click(a: Element): boolean {
  const mouseEvent = document.createEvent("MouseEvents");
  mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
    , false, false, false, false, 0, null);
  return a.dispatchEvent(mouseEvent);
}

function formatCmdErrors_(errors: string[][]): string {
  let i: number, line: string[], output = errors.length > 1 ? "Errors:\n" : "Error: "
  for (line of errors) {
    i = 0
    output += line[0].replace(<RegExpG & RegExpSearchable<1>>/%([a-z])/g, (_, s: string): string => {
      ++i
      return s === "c" ? "" : s === "s" || s === "d" ? line[i] : JSON.stringify(line[i])
    })
    if (i + 1 < line.length) {
      output += ` ${
          line.slice(i + 1).map(x => typeof x === "object" && x ? JSON.stringify(x) : x
          ).join(" ") }.\n`
    }
  }
  return output
}
