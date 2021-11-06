
declare namespace CompletersNS {
  const enum SugType {
    Empty = 0,
    bookmark = 1,
    history = 2,
    tab = 4,
    search = 8,
    domain = 16,
    Full = 0x3f,
    /** bookmark | history | tab */ MultipleCandidates = 7,
  }
  const enum QComponent { NONE = 0, mode = 1, query = 2, offset = 4, queryOrOffset = query | offset }
  /**
   * only those >= .Default can be used in content
   */
  const enum MatchType {
    plain = 0,
    Default = plain,
    emptyResult = 1, // require query is not empty
    someMatches = 2,
    /**
     * must > someMatches
     */
    searchWanted = 3,
    reset = -1,
    /**
     * is the same as searchWanted
     */
    searching_ = -2,
    SugTypeOffset = 3,
    MatchTypeMask = (1 << SugTypeOffset) - 1,
  }
  type ValidTypes = "bookm" | "domain" | "history" | "omni" | "bomni" | "search" | "tab";
  /**
   * "math" can not be the first suggestion, which is limited by omnibox handlers
   */
  type ValidSugTypes = ValidTypes | "math";
  const enum QueryFlags {
    None = 0,
    AddressBar = 1,
    TabInCurrentWindow = 2,
    PreferNewOpened = 4,
    TabTree = 8,
    MonospaceURL = 16,
    ShowTime = 32,
    PreferBookmarks = 64,
    TabTreeFromStart = 128,
    NoTabEngine = 256,
    EvenHiddenTabs = 512,
    NoSessions = 1024,
    IncognitoTabs = 2048,
  }
  interface Options {
    /** maxChars */ c?: number;
    /** allowedEngines */ e?: SugType;
    /** maxResults */ r?: number;
    /** flags */ f: QueryFlags;
    /** last sug types: empty means all */ t: SugType;
    /** original type */ o: ValidTypes;
  }

  interface WritableCoreSuggestion {
    /** enumType */ e: ValidSugTypes;
    /** url */ u: string;
    title: string; // used by vomnibar.html
    /** text */ t: string;
    visit: number
  }

  type CoreSuggestion = Readonly<WritableCoreSuggestion>;

  type SessionId = [windowId: number, sessionId: string] | /** tabId */ number
  interface BaseSuggestion extends CoreSuggestion {
    t: string;
    textSplit?: string;
    title: string;
    visit: number
    /** sessionId */ s?: SessionId
    label?: string;
    /** source page of favIcon */ v?: string;
    favIcon?: string;
  }
  interface Suggestion extends BaseSuggestion {
    /** relevancy */ r: number;
  }
  interface SearchSuggestion extends Suggestion {
    e: "search";
    /** pattern */ p: string;
    /** not-a-search */ n?: 1;
  }
  interface TabSuggestion extends Suggestion {
    level?: string;
  }
}

declare namespace MarksNS {
  type ScrollInfo = [ x: number, y: number, hash?: string ]
  interface ScrollableMark {
    scroll: ScrollInfo;
  }
  interface BaseMark {
    /** markName */ n: string;
  }

  interface BaseMarkProps {
    /** scroll */ s: ScrollInfo;
    /** url */ u: string;
  }

  interface Mark extends BaseMark, BaseMarkProps {
  }

  interface NewTopMark extends BaseMark {
    /** scroll */ s?: undefined;
  }
  interface NewMark extends Mark {
    /** local */ l?: 0 | 2; /** default to false */
  }

  interface FgGlobalQuery extends BaseMark {
    /** local */ l?: 0; /** default to false */
    /** url */ u?: undefined;
    /** old */ o?: undefined
  }
  interface FgLocalQuery extends BaseMark {
    /** local */ l: 2;
    /** url */ u: string;
    /** old */ o?: {
      /** scrollX */ x: number;
      /** scrollY */ y: number;
      /** hash */ h: string;
    };
  }
  type FgQuery = FgGlobalQuery | FgLocalQuery;

  interface FgMark extends ScrollInfo {
    [2]?: string;
  }

  interface FocusOrLaunch {
    /** scroll */ s?: ScrollInfo;
    /** url */ u: string;
    /** prefix */ p?: boolean | null
    /** match a tab to replace */ q?: SimpleParsedOpenUrlOptions
    /** fallback */ f?: Req.FallbackOptions | null
  }
}

declare namespace VisualModeNS {
  const enum Mode {
    NotActive = 0, Default = NotActive,
    Visual = 1,
    Line = 2,
    Caret = 3,
  }
  const enum kDir {
    left = 0, right = 1, unknown = 2,
    __mask = -1,
  }
  type ForwardDir = kDir.left | kDir.right;
  interface KeyMap extends Dict<VisualAction | Dict<VisualAction>> {
    a: Dict<VisualAction>
    g: Dict<VisualAction>
  }
  interface SafeKeyMap extends KeyMap, SafeObject {
    a: SafeDict<VisualAction>
    g: SafeDict<VisualAction>
    [key: string]: VisualAction | SafeDict<VisualAction> | undefined;
  }
  const enum kVimG {
      vimWord = 2,
      _mask = -1,
  }
}
declare const enum VisualAction {
  MinNotNoop = 0, Noop = MinNotNoop - 1,

  MinWrapSelectionModify = MinNotNoop,
  char = VisualModeNS.kG.character << 1,
  word = VisualModeNS.kG.word << 1, vimWord = VisualModeNS.kVimG.vimWord << 1,
  lineBoundary = VisualModeNS.kG.lineBoundary << 1, line = VisualModeNS.kG.line << 1,
  sentence = VisualModeNS.kG.sentence << 1, paragraph = VisualModeNS.kG.paragraph << 1,
  documentBoundary = VisualModeNS.kG.documentBoundary << 1,
  dec = VisualModeNS.kDir.left, inc = VisualModeNS.kDir.right,

  MinNotWrapSelectionModify = 20,
  Reverse = MinNotWrapSelectionModify,

  MaxNotLexical = MinNotWrapSelectionModify,
  LexicalSentence = MaxNotLexical + VisualModeNS.kG.sentence,
  LexicalWord = MaxNotLexical + VisualModeNS.kG.word,

  MaxNotYank = 30, Yank, YankLine, YankWithoutExit, YankAndOpen, YankAndNewTab, YankRichText,

  MaxNotFind = 45, PerformFind, FindPrevious = PerformFind | dec, FindNext = PerformFind | inc, HighlightRange,

  MaxNotNewMode = 50,
  VisualMode = MaxNotNewMode + VisualModeNS.Mode.Visual, VisualLineMode = MaxNotNewMode + VisualModeNS.Mode.Line,
  CaretMode = MaxNotNewMode + VisualModeNS.Mode.Caret, EmbeddedFindMode = CaretMode + 2,

  MaxNotScroll = 60, ScrollUp, ScrollDown,
}

declare const enum KeyAction {
  cmd = 0, count = 1,
  __mask = -1,
}
type ValidChildKeyAction = KeyAction.cmd;
type ValidKeyAction = ValidChildKeyAction | KeyAction.count;
interface ChildKeyFSM {
  [index: string]: ValidChildKeyAction | ChildKeyFSM | undefined;
}
interface ReadonlyChildKeyFSM {
  readonly [index: string]: ValidChildKeyAction | ReadonlyChildKeyFSM | undefined;
}
type KeyFSM = ReadonlySafeDict<ValidKeyAction | ReadonlyChildKeyFSM>;

declare const enum kMapKey {
  NONE = 0, insertMode = 1, otherMode = 2, normal = 4, char = 8,
  normal_long = 16, normalOnlyMode = 32, directInsert = 64,
}
declare const enum kMappingsFlag {
  char0 = "#", char1 = "!",
  noCheck = "no-check",
}

declare const enum kMatchUrl { RegExp = 1, StringPrefix = 2, Pattern = 3 }
interface BaseUrlMatcher {
  /** type */ readonly t: kMatchUrl
  /** value */ readonly v: unknown
}
interface RegExpUrlMatcher extends BaseUrlMatcher {
  /** type */ readonly t: kMatchUrl.RegExp
  /** value */ readonly v: RegExpOne
}
interface PrefixUrlMatcher extends BaseUrlMatcher {
  /** type */ readonly t: kMatchUrl.StringPrefix
  /** value */ readonly v: string
}
interface PatternUrlMatcher extends BaseUrlMatcher {
  /** type */ readonly t: kMatchUrl.Pattern
  /** value */ readonly v: URLPattern
}
type ValidUrlMatchers = RegExpUrlMatcher | PrefixUrlMatcher | PatternUrlMatcher

type TextElement = HTMLInputElement | HTMLTextAreaElement;

declare const enum ReuseType {
  current = 0,
  reuse = 1,
  newWnd = 2,
  /** @deprecated */ newWindow = newWnd,
  newFg = -1,
  newBg = -2,
  OFFSET_LAST_WINDOW = -4,
  lastWndFg = -5,
  /** @deprecated */ lastWnd = lastWndFg,
  lastWndBg = -6,
  ifLastWnd = -7,
  lastWndBgInactive = -8,
  /** @deprecated */ lastWndBgBg = lastWndBgInactive,
  Default = newFg,
  MAX = 2,
}
type ValidReuseNames = Exclude<keyof typeof ReuseType, "MAX" | "OFFSET_LAST_WINDOW" | "Default">
declare type UserReuseType = ReuseType | boolean | ValidReuseNames
    | "newwindow" | "new-window" | "newwnd" | "new-wnd" | "newfg" | "new-fg" | "newbg" | "new-bg"
    | "lastwndfg" | "lastwnd" | "last-wnd-fg" | "last-wnd" | "lastwndbg" | "last-wnd-bg" | "if-last-wnd" | "iflastwnd"
    | "last-wnd-bgbg" | "lastwndbgbg" | "last-wnd-bg-inactive" | "lastwndbginactive"

declare const enum FrameMaskType {
  NoMaskAndNoFocus = 0,
  NoMask = 1,
  OnlySelf = 2,
  NormalNext = 3,
  ForcedSelf = 4,
  minWillMask = OnlySelf,
}

declare const enum ProtocolType {
  others = 0,
  http = 7, https = 8,
}

declare namespace Frames {
  const enum Status {
    enabled = 0, partial = 1, disabled = 2,
    __fake = -1
  }
  // upper-case items are for tabs
  const enum Flags {
    Default = 0, blank = Default, locked = 1, lockedAndDisabled = 3, MASK_LOCK_STATUS = 3, userActed = 4,
    hasCSS = 8, hadVisualMode = 16, hasFindCSS = 32, hadHelpDialog = 64,
    OtherExtension = 128, isVomnibar = 256, SOURCE_WARNED = 512
  }
  const enum NextType {
    next = 0, Default = next, parent = 1, current = 2,
  }
}

declare const enum PortNameEnum {
  Prefix = "vimium-c.",
  PrefixLen = 9,
  Delimiter = "@",
}

declare const enum PortType {
  initing = 0, isTop = 1, hasFocus = 2, reconnect = 4, hasCSS = 8,
  omnibar = 16, otherExtension = 32, selfPages = 64,
  /** for external extensions like NewTab Adapter */ CloseSelf = 999,
}

declare namespace SettingsNS {
  interface DirectlySyncedItems {
    /** ignoreKeyboardLayout */ l: ["ignoreKeyboardLayout", 0 | 1 | 2];
    /** keyboard */ k: ["keyboard", [delay: number, interval: number, /** on Firefox */ screenRefreshRate?: number]]
    /** linkHintCharacters */ c: ["linkHintCharacters", string];
    /** linkHintNumbers */ n: ["linkHintNumbers", string];
    /** filterLinkHints */ f: ["filterLinkHints", boolean];
    /** waitForEnter */ w: ["waitForEnter", boolean];
    /** mouseReachable */ e: ["mouseReachable", boolean];
    /** regexFindMode */ r: ["regexFindMode", boolean];
    /** scrollStepSize */ t: ["scrollStepSize", number];
    /** smoothScroll */ s: ["smoothScroll", boolean];
    /** mapModifier */ a: ["mapModifier", 0 | 1 | 2];
  }
  interface TransformedAndSyncedItems {
    /** ignoreCapsLock */ i: ["ignoreCapsLock", boolean];
  }
  interface ManuallySyncedItems {
    /** darkMode */ d: ["darkMode", " D" | ""];
    /** reduceMotion */ m: ["reduceMotion", BaseBackendSettings["autoReduceMotion"]];
  }
  interface OneTimeItems {
    /** grabBackFocus */ g: ["grabBackFocus", BaseBackendSettings["grabBackFocus"]];
  }
  interface ConstItems {
    /** browser */ b: ["browser", BrowserType | undefined];
    /** browserVer */ v: ["browserVer", BrowserVer | FirefoxBrowserVer | 0 | undefined];
    /** OS */ o: ["OS", kOS.mac | kOS.unixLike | kOS.win];
  }
  type DeclaredConstValues = Readonly<SelectValueType<Pick<ConstItems, "v" | "o">>>;
  interface AllConstValues extends Readonly<SelectValueType<ConstItems>> {}
  interface VomnibarOptionItems {
    /** maxMatchNumber */ n: ["maxMatches", number];
    /** queryInterval */ t: ["queryInterval", number];
    /** comma-joined size numbers */ l: ["sizes", string];
    /** styles */ s: ["styles", string];
  }
  interface VomnibarBackendItems {
    actions: string;
  }
  interface OtherVomnibarItems {
    /** css */ c: ["omniCSS", string];
    /** mappedKeys */ k: ["mappedKeys", SafeDict<string> | null];
  }

  interface BaseBackendSettings {
    autoReduceMotion: boolean;
    grabBackFocus: boolean;
    /** if want to rework it, must search it in all files and take care */
    ignoreCapsLock: 0 | 1 | 2;
    newTabUrl_f: string;
    showAdvancedCommands: boolean;
    vomnibarOptions: SelectNVType<VomnibarOptionItems> & VomnibarBackendItems;
  }
  interface FrontUpdateAllowedSettings {
    showAdvancedCommands: 0;
  }

  interface AutoSyncedItems extends DirectlySyncedItems, TransformedAndSyncedItems {}
  interface FrontendSettingsSyncingItems extends AutoSyncedItems, ManuallySyncedItems {}
  interface DeclaredFrontendValues extends SelectValueType<ManuallySyncedItems & OneTimeItems>, DeclaredConstValues {
  }
  type AutoSyncedNameMap = SelectNameToKey<AutoSyncedItems>
  type FrontendSettings = SelectNVType<DirectlySyncedItems>;

  /** Note: should have NO names which may be uglified */
  interface FrontendSettingCache extends AllConstValues
      , SelectValueType<FrontendSettingsSyncingItems & OneTimeItems> {
  }

  /** Note: should have NO names which may be uglified */
  interface AllVomnibarItems extends VomnibarOptionItems, OtherVomnibarItems
      , Pick<DirectlySyncedItems, "a"> {
  }
  interface VomnibarPayload extends AllConstValues, SelectValueType<AllVomnibarItems> {
  }
  interface DeclaredVomnibarPayload extends SelectValueType<AllVomnibarItems>, DeclaredConstValues {
  }
}
declare const enum kOS {
  mac = 0, unixLike = 1, win = 2,
  MAX_NOT_WIN = 1, UNKNOWN = 9,
}

declare const enum HintMode {
  empty = 0, focused = 1, list = 1, newTab = 2, newtab_n_active = focused | newTab, mask_focus_new = newtab_n_active,
  queue = 16, min_job = 32, min_disable_queue = 64,
  OPEN_IN_CURRENT_TAB = empty, DEFAULT = OPEN_IN_CURRENT_TAB, // also 1
  OPEN_IN_NEW_BG_TAB = newTab,
  OPEN_IN_NEW_FG_TAB = newTab | focused,
  OPEN_CURRENT_WITH_QUEUE = queue,
  OPEN_WITH_QUEUE = queue | newTab,
  OPEN_FG_WITH_QUEUE = queue | newTab | focused,
  HOVER = min_job, min_hovering = HOVER,
  UNHOVER, max_hovering = UNHOVER, max_mouse_events = UNHOVER,
  FOCUS,
  DOWNLOAD_MEDIA, min_media = DOWNLOAD_MEDIA,
  OPEN_IMAGE, max_media = OPEN_IMAGE,
  SEARCH_TEXT,
  COPY_TEXT = (SEARCH_TEXT & ~1) + 2, min_copying = COPY_TEXT, mode1_text_list = COPY_TEXT | list,
  COPY_URL, mode1_url_list = COPY_URL | list, min_link_job = COPY_URL, max_copying = mode1_url_list,
  DOWNLOAD_LINK,
  OPEN_INCOGNITO_LINK,
  EDIT_LINK_URL = min_disable_queue, max_link_job = EDIT_LINK_URL, min_edit = EDIT_LINK_URL,
  EDIT_TEXT, max_edit = EDIT_TEXT,
  FOCUS_EDITABLE,
  ENTER_VISUAL_MODE,
    min_not_hint,
}

declare namespace VomnibarNS {
  const enum PageType {
    inner = 0, ext = 1, web = 2,
    Default = inner,
  }
  const enum PixelData {
    MarginTop = 64,
    InputBar = 54, InputBarWithLine = InputBar + 1,
    Item = 44, LastItemDelta = 46 - Item,
    MarginV1 = 9, MarginV2 = 10, ShadowOffset = 2, MarginV = MarginV1 + MarginV2 + ShadowOffset * 2,
    OthersIfEmpty = InputBar + MarginV,
    OthersIfNotEmpty = InputBarWithLine + MarginV + LastItemDelta,
    ListSpaceDeltaWithoutScrollbar = MarginTop + MarginV1 + InputBarWithLine + LastItemDelta + ((MarginV2 / 2) | 0),
    MarginH = 24, AllHNotUrl = 20 * 2 + 20 + MarginH,
    MeanWidthOfMonoFont = 7.7, MeanWidthOfNonMonoFont = 4,
    WindowSizeX = 0.8, AllHNotInput = AllHNotUrl,
  }
  interface GlobalOptions extends TrailingSlashOptions, UserSedOptions {
    mode: string;
    currentWindow?: boolean;
    newtab: boolean | BOOL;
    keyword: string;
    url?: true | string | null;
    exitOnClick?: boolean;
    autoSelect?: boolean | null | BOOL;
    preferTabs?: "new" | "new-opened" | "newOpened";
    engines?: CompletersNS.SugType.Empty | CompletersNS.SugType.Full | keyof typeof CompletersNS.SugType
        | ReadonlyArray<keyof typeof CompletersNS.SugType>
    noTabs?: boolean;
    hiddenTabs?: boolean;
    incognitoTabs?: boolean;
    icase?: boolean;
    searchInput?: boolean;
    tree?: boolean | "from-start"; // show tabs in tree mode
    incognito?: OpenUrlOptions["incognito"]
    noSessions?: boolean | "always" | "start"
    clickLike?: null | "chrome" | /** as "chrome" */ true | "vivaldi" | /** as "vivaldi" */ "chrome2"
    position: OpenPageUrlOptions["position"]
  }
}

interface ElementSet {
  add (value: Element): unknown;
  has (value: Element): boolean
}

declare const enum InjectorTask {
  reload = 1,
  recheckLiving = 2,
  reportLiving = 3,
  extInited = 4,
}
interface VApiTy {
  $r?: VimiumInjectorTy["$r"]
  /** destroy */ d: (this: void, silent?: boolean | BOOL | 9) => void
}
interface VimiumInjectorTy {
  id: string;
  alive: 0 | 0.5 | 1 | -1;
  host: string;
  version: string;
  $: VApiTy;
  $h: ExternalMsgs[kFgReq.inject]["res"]["h"];
  clickable: ElementSet | null | undefined;
  cache: Dict<any> | null;
  getCommandCount: (this: void) => number;
  checkIfEnabled: (this: void) => void;
  /** on message to run */ $m (taskType: BgReq[kBgReq.injectorRun] | BgReq[kBgReq.injectorRun]["t"]): void;
  $r (taskType: InjectorTask): void;
  reload (req?: boolean | InjectorTask.reload): void;
  destroy: ((this: void, silent?: boolean) => void) | null;
  callback: ((this: void, code: number, error: string) => unknown) | null;
  /** block focus */ $g: null | boolean // null means false
}

interface Document extends DocumentAttrsToBeDetected {}

declare const enum GlobalConsts {
  TabIdNone = -1,
  VomnibarFakeTabId = -3,
  MaxImpossibleTabId = -4,
  WndIdNone = -1,
  MinHintCharSetSize = 4,
  MaxCountToHint = 1e6,
  MaxLengthOfShownText = 35, // include the length of ": "
  MaxLengthOfHintText = 252, // [512 bytes - (sizeof(uchar*) = 8)] / sizeof(uchar) = 252
  MatchingScoreFactorForHintText = 1e4,
  VomnibarSecretLength = 16, // *4 = 64 bits; should >= 8 (*4 = 32 bits); other values: "" | "1" | "2" | "omni"
  VomnibarSecretTimeout = 8000, // should be much larger than {@see ../content/omni.ts#init::slowLoadTimer}'s
  VomnibarWheelStepForPage = 300,
  VomnibarWheelIntervalForPage = 150,
  WheelTimeout = 330,
  TouchpadTimeout = 120,
  DefaultRectFlashTime = 400,
  MaxCountToGrabBackFocus = 16,
  // limited by Pagination.findAndFollowLink_
  MaxNumberOfNextPatterns = 200,
  MaxBufferLengthForPastingNormalText = /** 100K */ 102400,
  MaxBufferLengthForPastingLongURL    = /** 20M */ 20971520,
  TimeoutToReleaseBackendModules = /** (to make TS silent) 1000 * 60 * 5 */ 300000,
  ToleranceForTimeoutToGC = 100000,
  ToleranceOfNegativeTimeDelta = 5000,
  ThresholdToAutoLimitTabOperation = 2, // 2 * Tab[].length
  LinkHintTooHighThreshold = 20, // scrollHeight / innerHeight
  LinkHintPageHeightLimitToCheckViewportFirst = 15000,
  MinElementCountToStopPointerDetection = 400,
  MinElementCountToStopScanOnClick = 5000,
  MaxScrollbarWidth = 24,
  MinScrollableAreaSizeForDetection = 50,
  MaxHeightOfLinkHintMarker = 24,
  FirefoxFocusResponseTimeout = 340,
  MaxLimitOfVomnibarMatches = 25,
  MaxFindHistory = 50,
  TimeOfSuppressingTailKeydownEvents = 200,
  TimeOfSuppressingUnexpectedKeydownEvents = 220,
  CommandCountLimit = 9999,
  MediaWatchInterval = 60_000, // 60 seconds - chrome.alarms only accepts an interval >= 1min, so do us
  MaxHistoryURLLength = 2_000, // to avoid data: URLs and malformed webpages
  TrimmedURLPathLengthWhenURLIsTooLong = 320,
  TrimmedTitleLengthWhenURLIsTooLong = 160,
  MatchCacheLifeTime = 6000,
  TabCacheLifeTime = 3000,
  // so that `P` = 89 / 9e7 < 1e-6
  SecretRange = 9e7,
  SecretBase = 1e7,
  SecretStringLength = 8,
  MaxRetryTimesForSecret = 89,
  MarkAcrossJSWorlds = "__VimiumC_", // .length should be {@link #GlobalConsts.LengthOfMarkAcrossJSWorlds}
  LengthOfMarkAcrossJSWorlds = 10,
  ExtendClick_DelayToFindAll = 600,
  ExtendClick_DelayToStartIteration = 666,
  SYNC_QUOTA_BYTES = 102_400, // QUOTA_BYTES of storage.sync in https://developer.chrome.com/extensions/storage
  SYNC_QUOTA_BYTES_PER_ITEM = 8192,
  /** ceil(102_400 / (8192 - (12 + 16) * 4)) ; 12 and 16 is inner consts in {@link ../background/others.ts} */
  MaxSyncedSlices = 13,
  LOCAL_QUOTA_BYTES = 5_242_880, // 5MB ; no QUOTA_BYTES_PER_ITEM for local
  LOCAL_STORAGE_BYTES = 10_485_760, // 10MB
  MaxTabTreeIndent = 5,
  MinStayTimeToRecordTabRecency = 666,
  MaxTabRecency = 2047,
  MaxTabsKeepingRecency = 1023,
  FirefoxAddonPrefix = "https://addons.mozilla.org/firefox/addon/",
  FirefoxHelp = "https://support.mozilla.org/kb/keyboard-shortcuts-perform-firefox-tasks-quickly",
  ChromeWebStorePage = "https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/$id/reviews",
  ChromeHelp = "https://support.google.com/chrome/answer/157179",
  EdgStorePage = "https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo",
  EdgHelp = "https://support.microsoft.com/help/4531783/microsoft-edge-keyboard-shortcuts",

  kIsHighContrast = "isHC_f",

  SelectorPrefixesInPatterns = ".#[",
  DelimiterBetweenKeyCharAndMode = ":",
  ModeIds = "nilofvmes",
  InsertModeId = "i",
  NormalOnlyModeId = "n",
  OmniModeId = "o",
  KeySequenceTimeout = 3e5,
  OptionsPage = "pages/options.html",
  kLoadEvent = "VimiumC"
}

declare const enum kModeId {
  Normal = 0, Insert, Link, Omni, Find, Visual, Marks,
  Next, Show,
  NO_MAP_KEY,
}

declare const enum kCharCode {
  tab = 9, space = 32, minNotSpace, bang = 33, quote2 = 34, hash = 35,
  maxCommentHead = hash, and = 38, quote1 = 39,
  /** '-' */ dash = 45,
  dot = 46, slash = 47,
  maxNotNum = 48 - 1, N0, N1, N9 = N0 + 9, minNotNum, colon = 58, lt = 60, gt = 62, question = 63,
  A = 65, maxNotAlphabet = A - 1, minAlphabet = A,
  B, C, I = A + 8, K = I + 2, R = A + 17, S = A + 18, W = A + 22, Z = A + 25, maxAlphabet = A + 25, minNotAlphabet,
  a = 97, CASE_DELTA = a - A,
  backslash = 92, s = 115,
}

declare const enum kKeyCode {
  None = 0, True = 1,
  backspace = 8, tab = 9, enter = 13, shiftKey = 16, ctrlKey = 17, altKey = 18, esc = 27,
  minAcsKeys = 16, maxAcsKeys = 18,
  maxNotPrintable = 32 - 1, space, maxNotPageUp = space, pageup, minNotSpace = pageup,
  pagedown, maxNotEnd = pagedown, end, home, maxNotLeft = home, left, up,
  right, minNotUp = right, down, minNotDown,
  maxNotInsert = 45 - 1, insert, deleteKey, minNotDelete,
  maxNotNum = 48 - 1, N0, N9 = N0 + 9, minNotNum,
  maxNotAlphabet = 65 - 1, A, B, C, D, E, F, G, H, I, J, K, L, M, N,
  O, P, Q, R, S, T, U, V, W, X, Y, Z, MinNotAlphabet,
  metaKey = 91, osRightNonMac = 92, osRightMac = 93, menuKey = 93, maxNotFn = 112 - 1, f1, f2, f5 = f1 + 4,
  maxNotMetaKey = metaKey - 1, minNotMetaKeyOrMenu = menuKey + 1,
  f10 = f1 + 9, f12 = f1 + 11, f13, f20 = f1 + 19, minNotFn, ime = 229,
  questionWin = 191, questionMac = kCharCode.question, bracketleftOnFF = 64,
}
declare const enum KeyStat {
  Default = 0, plain = Default,
  altKey = 1, ctrlKey = 2, metaKey = 4, shiftKey = 8,
  PrimaryModifier = ctrlKey | metaKey,
  ExceptShift = altKey | ctrlKey | metaKey, ExceptPrimaryModifier = altKey | shiftKey,
}
declare const enum kChar {
  INVALID = " ", EMPTY = "",
  hash = "#", minNotCommentHead = "$",
  space = "space", pageup = "pageup", pagedown = "pagedown",
  end = "end", home = "home", left = "left", up = "up", right = "right", down = "down",
  insert = "insert", delete = "delete",
  backspace = "backspace", esc = "esc", tab = "tab", enter = "enter",
  minus = "-", bracketLeft = "[", bracketRight = "]",
  a = "a", b = "b", c = "c", d = "d", e = "e", f = "f", g = "g",
  h = "h", i = "i", j = "j", k = "k", l = "l", m = "m", n = "n",
  o = "o", p = "p", q = "q", r = "r", s = "s", t = "t", u = "u", v = "v", w = "w", x = "x", y = "y", z = "z",
  None = "", F_num = "f", f1 = "f1", f2 = "f2", f12 = "f12",
  maxNotNum = "/", minNotNum = ":",
  maxNotF_num = "f0", minNotF_num = "f:", maxF_num = "f9",
  CharCorrectionList = ";=,-./`[\\]'\\:+<_>?~{|}\"|", EnNumTrans = ")!@#$%^&*(",
  Modifier = "modifier", Alt = "alt",
}

declare const enum BrowserType {
  Chrome = 1,
  Firefox = 2,
  Edge = 4,
  Safari = 8,
  Unknown = 16,
  ChromeOrFirefox = Chrome | Firefox,
}
