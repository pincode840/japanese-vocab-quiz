(function (root) {
  "use strict";

  const data = root.READING_QUIZ_DATA;
  if (!Array.isArray(data)) return;

  const common = root.READING_COMMON_READINGS || (root.READING_COMMON_READINGS = {});
  const term = (text, reading) => ({ text, reading });
  const register = (items) => {
    items.forEach((item) => { common[item.text] = item.reading; });
    return items;
  };
  const pick = (items, index) => items[index % items.length];
  const text = (item) => item.text;

  const weekdays = register([
    term("月曜日", "げつようび"), term("火曜日", "かようび"), term("水曜日", "すいようび"),
    term("木曜日", "もくようび"), term("金曜日", "きんようび"), term("土曜日", "どようび"),
  ]);
  const times = register([
    term("午前九時", "ごぜんくじ"), term("午前十時", "ごぜんじゅうじ"), term("午前十一時", "ごぜんじゅういちじ"),
    term("午後一時", "ごごいちじ"), term("午後二時", "ごごにじ"), term("午後三時", "ごごさんじ"),
  ]);
  const facilities = register([
    term("市民図書館", "しみんとしょかん"), term("中央図書館", "ちゅうおうとしょかん"), term("駅前図書館", "えきまえとしょかん"),
    term("東町図書館", "ひがしまちとしょかん"), term("西町図書館", "にしまちとしょかん"), term("青葉図書館", "あおばとしょかん"),
  ]);
  const returnBoxes = register([
    term("正面入口の返却箱", "しょうめんいりぐちのへんきゃくばこ"),
    term("駐車場横の返却箱", "ちゅうしゃじょうよこのへんきゃくばこ"),
    term("駅側入口の返却箱", "えきがわいりぐちのへんきゃくばこ"),
  ]);
  const venues = register([
    term("中央公園", "ちゅうおうこうえん"), term("駅前広場", "えきまえひろば"), term("市民会館", "しみんかいかん"),
    term("青葉公園", "あおばこうえん"), term("文化広場", "ぶんかひろば"), term("学校運動場", "がっこううんどうじょう"),
  ]);
  const indoorVenues = register([
    term("市民体育館", "しみんたいいくかん"), term("文化会館", "ぶんかかいかん"), term("学校講堂", "がっこうこうどう"),
  ]);
  const stationNames = register([
    term("桜駅", "さくらえき"), term("青葉駅", "あおばえき"), term("中央駅", "ちゅうおうえき"),
    term("海岸駅", "かいがんえき"), term("北町駅", "きたまちえき"), term("南町駅", "みなみまちえき"),
  ]);
  const transferStations = register([
    term("新町駅", "しんまちえき"), term("川口駅", "かわぐちえき"), term("本町駅", "ほんまちえき"),
  ]);
  const clinics = register([
    term("さくら医院", "さくらいいん"), term("中央診療所", "ちゅうおうしんりょうじょ"), term("青葉医院", "あおばいいん"),
    term("駅前診療所", "えきまえしんりょうじょ"), term("東町医院", "ひがしまちいいん"), term("西町診療所", "にしまちしんりょうじょ"),
  ]);
  const museums = register([
    term("市立美術館", "しりつびじゅつかん"), term("歴史博物館", "れきしはくぶつかん"), term("科学資料館", "かがくしりょうかん"),
    term("写真美術館", "しゃしんびじゅつかん"), term("自然博物館", "しぜんはくぶつかん"), term("地域資料館", "ちいきしりょうかん"),
  ]);
  const officeFloors = register([
    term("二階", "にかい"), term("三階", "さんがい"), term("四階", "よんかい"),
    term("五階", "ごかい"), term("六階", "ろっかい"), term("七階", "ななかい"),
  ]);
  const cities = register([
    term("大阪", "おおさか"), term("京都", "きょうと"), term("名古屋", "なごや"),
    term("福岡", "ふくおか"), term("仙台", "せんだい"), term("広島", "ひろしま"),
  ]);
  const products = register([
    term("電気ポット", "でんきポット"), term("卓上ライト", "たくじょうライト"), term("小型扇風機", "こがたせんぷうき"),
    term("保温ボトル", "ほおんボトル"), term("電子時計", "でんしどけい"), term("携帯充電器", "けいたいじゅうでんき"),
  ]);
  const foods = register([
    term("弁当", "べんとう"), term("サンドイッチ", "サンドイッチ"), term("焼き魚", "やきざかな"),
    term("おにぎり", "おにぎり"), term("野菜料理", "やさいりょうり"), term("焼きそば", "やきそば"),
  ]);
  const trainingTopics = register([
    term("接客研修", "せっきゃくけんしゅう"), term("安全研修", "あんぜんけんしゅう"), term("情報管理研修", "じょうほうかんりけんしゅう"),
    term("新人研修", "しんじんけんしゅう"), term("電話対応研修", "でんわたいおうけんしゅう"), term("品質管理研修", "ひんしつかんりけんしゅう"),
  ]);
  const lostItems = register([
    term("黒い傘", "くろいかさ"), term("青い手帳", "あおいてちょう"), term("茶色の財布", "ちゃいろのさいふ"),
    term("白い帽子", "しろいぼうし"), term("銀色の鍵", "ぎんいろのかぎ"), term("赤い水筒", "あかいすいとう"),
  ]);
  const departments = register([
    term("営業部", "えいぎょうぶ"), term("企画部", "きかくぶ"), term("総務部", "そうむぶ"),
    term("開発部", "かいはつぶ"), term("広報部", "こうほうぶ"), term("管理部", "かんりぶ"),
  ]);
  const regions = register([
    term("東日本", "ひがしにほん"), term("西日本", "にしにほん"), term("関東地域", "かんとうちいき"),
    term("関西地域", "かんさいちいき"), term("北部地域", "ほくぶちいき"), term("南部地域", "なんぶちいき"),
  ]);
  const documents = register([
    term("企画書", "きかくしょ"), term("見積書", "みつもりしょ"), term("月次報告書", "げつじほうこくしょ"),
    term("提案書", "ていあんしょ"), term("調査資料", "ちょうさしりょう"), term("販売計画書", "はんばいけいかくしょ"),
  ]);
  const months = register([
    term("九月", "くがつ"), term("十月", "じゅうがつ"), term("十一月", "じゅういちがつ"),
    term("十二月", "じゅうにがつ"), term("一月", "いちがつ"), term("二月", "にがつ"),
  ]);

  Object.assign(common, {
    設備点検: "せつびてんけん", 館内整理: "かんないせいり", 電気工事: "でんきこうじ", 休館: "きゅうかん",
    返却: "へんきゃく", 本: "ほん", 入れて: "いれて", 人: "ひと", 利用する: "りようする", 窓口: "まどぐち",
    職員: "しょくいん", 待つ: "まつ", 郵便: "ゆうびん", 送る: "おくる", 次の授業: "つぎのじゅぎょう",
    教科書: "きょうかしょ", 読み: "よみ", 字程度: "じていど", 感想: "かんそう", 書いて: "かいて",
    提出日: "ていしゅつび", 指定部分: "していぶぶん", 全部: "ぜんぶ", 暗記する: "あんきする", 要約: "ようやく",
    授業後: "じゅぎょうご", 提出する: "ていしゅつする", 地域交流会: "ちいきこうりゅうか", 音楽会: "おんがくかい",
    文化祭: "ぶんかさい", 雨天: "うてん", 場合: "ばあい", 会場: "かいじょう", 変更します: "へんこうします",
    開始時刻: "かいしじこく", 予定: "よてい", 雨: "あめ", 降った: "ふった", 開催: "かいさい", 中止: "ちゅうし",
    一時間遅れる: "いちじかんおくれる", 外: "そと", 燃えるごみ: "もえるごみ", 朝八時: "あさはちじ",
    出してください: "だしてください", 祝日: "しゅくじつ", 回収: "かいしゅう", 正しい: "ただしい", 毎日: "まいにち",
    夜: "よる", 快速電車: "かいそくでんしゃ", 工事中: "こうじちゅう", 止まりません: "とまりません",
    一つ手前: "ひとつてまえ", 各駅停車: "かくえきていしゃ", 乗り換えて: "のりかえて", 行く: "いく",
    終わる: "おわる", 駅員: "えきいん", 呼ぶ: "よぶ", 予約: "よやく", 変更したい: "へんこうしたい",
    前日: "ぜんじつ", 電話してください: "でんわしてください", 当日: "とうじつ", 変更できません: "へんこうできません",
    診察券: "しんさつけん", 持って: "もって", 受付: "うけつけ", 連絡する: "れんらくする", 直接行く: "ちょくせついく",
    新しく予約する: "あたらしくよやくする", 商品: "しょうひん", 届け先: "とどけさき", 発送前: "はっそうまえ",
    会員画面: "かいいんがめん", 変更できます: "へんこうできます", 発送後: "はっそうご", 配送会社: "はいそうがいしゃ",
    直接連絡: "ちょくせつれんらく", 住所: "じゅうしょ", 店: "みせ", 注文し直す: "ちゅうもんしなおす",
    戻る: "もどる", 学生: "がくせい", 学生証: "がくせいしょう", 見せる: "みせる", 入館料: "にゅうかんりょう",
    割引: "わりびき", 平日: "へいじつ", 団体割引: "だんたいわりびき", 適用されません: "てきようされません",
    安く入る: "やすくはいる", 予約する: "よやくする", 制服: "せいふく", 着る: "きる", 午後: "ごご",
    コピー機: "コピーき", 修理: "しゅうり", 作業: "さぎょう", 一時間: "いちじかん", 急ぎ: "いそぎ",
    印刷: "いんさつ", 方: "かた", 間: "あいだ", 機械: "きかい", 使って: "つかって", 修理終了: "しゅうりしゅうりょう",
    修理会社: "しゅうりがいしゃ", 明日: "あした", 延期する: "えんきする", 出張: "しゅっちょう", 新幹線: "しんかんせん",
    出発: "しゅっぱつ", 改札前: "かいさつまえ", 二十分前: "にじゅっぷんまえ", 集合してください: "しゅうごうしてください",
    切符: "きっぷ", 予約票: "よやくひょう", 用意します: "よういします", 社員: "しゃいん", 準備: "じゅんび",
    必要: "ひつよう", 会議資料: "かいぎしりょう", 服: "ふく", 交通手段: "こうつうしゅだん", 買い物: "かいもの",
    一ポイント: "いちポイント", 付きます: "つきます", 百ポイント: "ひゃくポイント", 使えます: "つかえます",
    金券: "きんけん", 購入: "こうにゅう", 説明: "せつめい", 利用できる: "りようできる", 制度: "せいど",
    始まる: "はじまる", 現在品切れ: "げんざいしなぎれ", 来週: "らいしゅう", 再入荷: "さいにゅうか",
    入荷後: "にゅうかご", 取り置き: "とりおき", 希望: "きぼう", 名前: "なまえ", 電話番号: "でんわばんごう",
    返信してください: "へんしんしてください", 取り置いてもらう: "とりおいてもらう", 代金: "だいきん", 先に払う: "さきにはらう",
    注文する: "ちゅうもんする", 貯水槽清掃: "ちょすいそうせいそう", 午前: "ごぜん", 正午: "しょうご", 水道: "すいどう",
    使えません: "つかえません", 水: "みず", 事前: "じぜん", 蛇口: "じゃぐち", 閉めて: "しめて", 清掃前: "せいそうまえ",
    用意する: "よういする", 外出する: "がいしゅつする", 自分: "じぶん", 洗う: "あらう", 実施します: "じっしします",
    参加希望者: "さんかきぼうしゃ", 社内サイト: "しゃないサイト", 申し込んで: "もうしこんで", 定員: "ていいん",
    超えた: "こえた", 先着順: "せんちゃくじゅん", 参加したい: "さんかしたい", 参加費: "さんかひ", 上司: "じょうし",
    届けられました: "とどけられました", 心当たり: "こころあたり", 社員証: "しゃいんしょう", 来てください: "きてください",
    受け取る: "うけとる", 領収書: "りょうしゅうしょ", 道路工事: "どうろこうじ", 影響: "えいきょう",
    到着見込み: "とうちゃくみこみ", 受け取り: "うけとり", 難しい: "むずかしい", 配達状況画面: "はいたつじょうきょうがめん",
    日時: "にちじ", 変えられます: "かえられます", 営業所: "えいぎょうしょ", 取り消す: "とりけす",
    防災アプリ: "ぼうさいアプリ", 災害情報: "さいがいじょうほう", 避難所: "ひなんじょ", 場所: "ばしょ",
    混雑状況: "こんざつじょうきょう", 確認できます: "かくにんできます", 通信: "つうしん", 不安定: "ふあんてい",
    備えて: "そなえて", 地図: "ちず", 保存してください: "ほぞんしてください", 理由: "りゆう", 増やす: "ふやす",
    送る: "おくる", 軽くする: "かるくする", 食べ残し: "たべのこし", 減らす: "へらす", 客: "きゃく",
    持ち帰り用容器: "もちかえりようようき", 渡しています: "わたしています", 生もの: "なまもの", 長時間: "ちょうじかん",
    室温: "しつおん", 料理: "りょうり", 対象外: "たいしょうがい", 管理: "かんり", 責任: "せきにん",
    持ち帰れない: "もちかえれない", 加熱料理: "かねつりょうり", 焼き菓子: "やきがし", 駅前: "えきまえ",
    自転車: "じてんしゃ", 放置: "ほうち", 増えています: "ふえています", 短時間: "たんじかん", 駐輪場: "ちゅうりんじょう",
    来月: "らいげつ", 警告札: "けいこくふだ", 付けた後: "つけたあと", 移動します: "いどうします", 警告後: "けいこくご",
    販売される: "はんばいされる", 無料修理: "むりょうしゅうり", 公園: "こうえん", 無料給水機: "むりょうきゅうすいき",
    設置: "せっち", 地域: "ちいき", 利用者: "りようしゃ", 持参すれば: "じさんすれば", ごみ: "ごみ",
    減らせます: "へらせます", 衛生: "えいせい", 容器: "ようき", 給水口: "きゅうすいぐち", 触れさせないで: "ふれさせないで",
    注意: "ちゅうい", 新しい: "あたらしい", 有料購入: "ゆうりょうこうにゅう", 宅配便: "たくはいびん",
    共用ロッカー: "きょうようロッカー", 配達会社: "はいたつがいしゃ", 届く番号: "とどくばんごう", 荷物: "にもつ",
    到着から三日以内: "とうちゃくからみっかいない", 駅員の許可: "えきいんのきょか", 料金: "りょうきん", 自宅の鍵: "じたくのかぎ",
    地域市場: "ちいきいちば", 開きます: "ひらきます", 地元: "じもと", 野菜: "やさい", 菓子: "かし",
    販売する: "はんばいする", 本の交換: "ほんのこうかん", 予約不要: "よやくふよう", 中: "なか", 夜: "よる",
    暑い日: "あついひ", 渇く前: "かわくまえ", 少しずつ: "すこしずつ", 水分: "すいぶん", 取る: "とる",
    大切: "たいせつ", 屋内: "おくない", 熱中症: "ねっちゅうしょう", 我慢せず: "がまんせず", 冷房: "れいぼう",
    高齢者: "こうれいしゃ", 周囲: "しゅうい", 声をかける: "こえをかける", 文章: "ぶんしょう", 最も: "もっとも",
    伝えたい: "つたえたい", 外出禁止: "がいしゅつきんし", 授業中: "じゅぎょうちゅう", 使用: "しよう",
    一律禁止: "いちりつきんし", 学校: "がっこう", 調べ学習: "しらべがくしゅう", 役立つ: "やくだつ",
    重要: "じゅうよう", 目的: "もくてき", 時間: "じかん", 決めて: "きめて", 学習: "がくしゅう",
    妨げない: "さまたげない", 使い方: "つかいかた", 教える: "おしえる", 筆者: "ひっしゃ", 考え: "かんがえ",
    常に: "つねに", 自由: "じゆう", 適切: "てきせつ", 紙の辞書: "かみのじしょ", 各位: "かくい",
    提出期限: "ていしゅつきげん", 部長確認: "ぶちょうかくにん", 確保する: "かくほする", 完成した方: "かんせいしたかた",
    正午: "しょうご", 共有フォルダ: "きょうゆうフォルダ", 保存してください: "ほぞんしてください", 修正: "しゅうせい",
    主な目的: "おもなもくてき", 延ばす: "のばす", 早めの共有: "はやめのきょうゆう", 依頼する: "いらいする",
    会議: "かいぎ", 新製品: "しんせいひん", 発売: "はつばい", 目指していました: "めざしていました",
    安全試験: "あんぜんしけん", 追加確認: "ついかかくにん", 品質: "ひんしつ", 優先して: "ゆうせんして",
    延期します: "えんきします", 広告開始日: "こうこくかいしび", 二週間後: "にしゅうかんご", 決まった: "きまった",
    品質基準: "ひんしつきじゅん", 下げる: "さげる", 今期: "こんき", 売上: "うりあげ", 全体: "ぜんたい",
    前年: "ぜんねん", 上回りました: "うわまわりました", 特に: "とくに", 新規顧客: "しんきこきゃく",
    増えて: "ふえて", 伸びました: "のびました", 一方: "いっぽう", 既存商品: "きそんしょうひん", 不振: "ふしん",
    減少しました: "げんしょうしました", 報告内容: "ほうこくないよう", 合う: "あう", 全地域: "ぜんちいき", 大きい: "おおきい",
    先ほど: "さきほど", 送付した: "そうふした", 請求書: "せいきゅうしょ", 消費税額: "しょうひぜいがく",
    誤り: "あやまり", 訂正版: "ていせいばん", 添付します: "てんぷします", 先のファイル: "さきのファイル",
    破棄してください: "はきしてください", 支払期限: "しはらいきげん", 受信者: "じゅしんしゃ", 最初の請求書: "さいしょのせいきゅうしょ",
    計算する: "けいさんする", 支払い: "しはらい", 訪問先: "ほうもんさき", 当社: "とうしゃ", 提案: "ていあん",
    関心: "かんしん", 導入費用: "どうにゅうひよう", 予算: "よさん", 超える: "こえる", 指摘: "してき",
    次回: "じかい", 機能: "きのう", 絞った案: "しぼったあん", 分割払い: "ぶんかつばらい", 条件: "じょうけん",
    提示します: "ていじします", 訪問: "ほうもん", 高機能: "こうきのう", 値引き: "ねびき", 限定した案: "げんていしたあん",
    他社製品: "たしゃせいひん", 比較表: "ひかくひょう", 人気商品: "にんきしょうひん", 在庫: "ざいこ",
    残り: "のこり", 大型店: "おおがたてん", 通常配分: "つうじょうはいぶん", 続ける: "つづける",
    小型店: "こがたてん", 欠品: "けっぴん", 発生する恐れ: "はっせいするおそれ", 今週: "こんしゅう",
    各店舗: "かくてんぽ", 同じ数量: "おなじすうりょう", 来週改めて: "らいしゅうあらためて", 需要: "じゅよう",
    確認します: "かくにんします", 会社: "かいしゃ", 配分: "はいぶん", 出荷: "しゅっか", 止める: "とめる",
    各店: "かくてん", 倉庫: "そうこ", 残す: "のこす", 納品した: "のうひんした", 部品: "ぶひん",
    一部: "いちぶ", 傷: "きず", 連絡: "れんらく", 本日中: "ほんじつちゅう", 交換品: "こうかんひん",
    発送します: "はっそうします", 不良品: "ふりょうひん", 後日: "ごじつ", 回収します: "かいしゅうします",
    原因調査: "げんいんちょうさ", 結果: "けっか", 一週間以内: "いっしゅうかんいない", 報告します: "ほうこくします",
    最初に行う対応: "さいしょにおこなうたいおう", 報告書: "ほうこくしょ", 全商品: "ぜんしょうひん", 返金する: "へんきんする",
    本社移転: "ほんしゃいてん", 伴い: "ともない", 住所: "じゅうしょ", 代表電話番号: "だいひょうでんわばんごう",
    変わります: "かわります", 郵便物: "ゆうびんぶつ", 転送: "てんそう", 三か月間: "さんかげつかん",
    取引先: "とりひきさき", 今月中: "こんげつちゅう", 新住所: "しんじゅうしょ", 案内してください: "あんないしてください",
    知らせる: "しらせる", 解約する: "かいやくする", 三か月: "さんかげつ",
    返す: "かえす", 次の開館日: "つぎのかいかんび", 短い要約: "みじかいようやく", 書く: "かく",
    行事: "ぎょうじ", 夜八時: "よるはちじ", 呼んで: "よんで", 変更: "へんこう", 電話する: "でんわする",
    半額: "はんがく", 安くする: "やすくする", 団体: "だんたい", 行います: "おこないます", 使う: "つかう",
    出張用: "しゅっちょうよう", 駅まで: "えきまで", 含む: "ふくむ", 返信する: "へんしんする", もう一度: "もういちど",
    払う: "はらう", 落とし物: "おとしもの", 受付からの電話: "うけつけからのでんわ", 予定時刻: "よていじこく",
    到着する見込み: "とうちゃくするみこみ", 必ず行く: "かならずいく", 注文を自動で取り消す: "ちゅうもんをじどうでとりけす",
    知らせます: "しらせます", 周辺: "しゅうへん", 保存する: "ほぞんする", 市へ送る: "しへおくる",
    置かれた: "おかれた", 注文した: "ちゅうもんした", 一緒: "いっしょ", 買った: "かった", 十分: "じゅうぶん",
    加熱した料理: "かねつしたりょうり", 利用: "りよう", 自宅まで届ける: "じたくまでとどける", 移動される: "いどうされる",
    その場: "そのば", 無料で修理される: "むりょうでしゅうりされる", 持参し: "じさんし", 給水機: "きゅうすいき",
    触れさせない: "ふれさせない", 有料で購入する: "ゆうりょうでこうにゅうする", 飲む: "のむ", 三日分: "みっかぶん",
    朝: "あさ", 販売しない: "はんばいしない", 買える: "かえる", 予約制: "よやくせい", 気温: "きおん",
    高くなります: "たかくなります", 声をかけましょう: "こえをかけましょう", 教えます: "おしえます", 最も近い: "もっともちかい",
    決めた: "きめた", 禁止する: "きんしする", 確認時間: "かくにんじかん", 作る: "つくる", 延期する: "えんきする",
    始める: "はじめる", 最初の書類: "さいしょのしょるい", 破棄する: "はきする", 示しました: "しめしました",
    提示する: "ていじする", 高機能な案: "こうきのうなあん", 値引きなしの同じ案: "ねびきなしのおなじあん",
    機能を限定した案と支払条件: "きのうをげんていしたあんとしはらいじょうけん", 個: "こ", 送り: "おくり",
    発送する: "はっそうする", 発送し: "はっそうし", 購入時: "こうにゅうじ", 必ず: "かならず",
    受け取って: "うけとって", 受け取れない: "うけとれない", 受け取り: "うけとり", 受けました: "うけました",
    取り: "とり", 販売し: "はんばいし",
    飲めば: "のめば", 延期し: "えんきし",
  });

  register([
    term("300円", "さんびゃくえん"), term("400円", "よんひゃくえん"), term("500円", "ごひゃくえん"),
    term("600円", "ろっぴゃくえん"), term("700円", "ななひゃくえん"), term("800円", "はっぴゃくえん"),
  ]);

  function createQuestion(exam, number, type, passage, question, correct, distractors, explanation) {
    const baseChoices = [correct, ...distractors];
    const shift = number % baseChoices.length;
    const choices = baseChoices.slice(shift).concat(baseChoices.slice(0, shift));
    return {
      id: `reading-${exam.toLowerCase().replace(".", "")}-${String(number).padStart(3, "0")}`,
      exam,
      type,
      passage,
      question,
      choices,
      answer: choices.indexOf(correct),
      explanation,
      readings: {},
      origin: "original",
      generated: true,
    };
  }

  const jlptGenerators = [
    (number, variant) => {
      const facility = pick(facilities, variant);
      const day = pick(weekdays, Math.floor(variant / facilities.length));
      const box = pick(returnBoxes, variant);
      const reason = pick(["設備点検", "館内整理", "電気工事"], variant);
      return createQuestion("JLPT", number, "단문 이해",
        `${text(facility)}は${reason}のため、${text(day)}は休館します。返却する本は${text(box)}に入れてください。`,
        `${text(day)}に本を返す人はどうしますか。`,
        `${text(box)}を利用する`, ["窓口で職員を待つ", "本を郵便で送る", "次の開館日まで何もしない"],
        "휴관일에는 안내된 반납함을 이용해야 합니다.");
    },
    (number, variant) => {
      const start = 20 + (variant % 6) * 5;
      const end = start + 12 + Math.floor(variant / 6) * 3;
      const chars = 200 + (variant % 3) * 100;
      const day = pick(weekdays, variant);
      return createQuestion("JLPT", number, "과제 안내",
        `次の授業までに教科書の${start}ページから${end}ページを読み、${chars}字程度の感想を書いてください。提出日は${text(day)}です。`,
        `学生は${text(day)}までに何をしますか。`,
        "指定部分を読んで感想を書く", ["教科書を全部暗記する", "短い要約だけを書く", "授業後に教科書を提出する"],
        "지정된 범위를 읽고 정해진 분량의 감상을 제출해야 합니다.");
    },
    (number, variant) => {
      const eventName = pick(["地域交流会", "音楽会", "文化祭"], variant);
      const venue = pick(venues, variant);
      const indoor = pick(indoorVenues, Math.floor(variant / venues.length));
      const timeValue = pick(times, variant);
      return createQuestion("JLPT", number, "공지 이해",
        `${eventName}は${text(venue)}で開きます。雨天の場合は${text(indoor)}に会場を変更します。開始時刻は予定どおり${text(timeValue)}です。`,
        "雨が降った場合、行事はどうなりますか。",
        `${text(indoor)}で${text(timeValue)}から開催する`, ["中止になる", "開始が一時間遅れる", `${text(venue)}で予定どおり開催する`],
        "비가 오면 실내 장소로 바뀌지만 시작 시각은 유지됩니다.");
    },
    (number, variant) => {
      const firstDay = pick(weekdays, variant);
      const secondDay = pick(weekdays, variant + 2);
      const area = pick(["東地区", "西地区", "中央地区"], Math.floor(variant / 6));
      common[area] ||= area === "東地区" ? "ひがしちく" : area === "西地区" ? "にしちく" : "ちゅうおうちく";
      return createQuestion("JLPT", number, "생활 안내",
        `${area}では、燃えるごみを${text(firstDay)}と${text(secondDay)}の朝八時までに出してください。祝日も回収します。`,
        "燃えるごみについて正しいものはどれですか。",
        `${text(firstDay)}と${text(secondDay)}に出す`, ["毎日出せる", "祝日は出せない", "夜八時までに出す"],
        "안내된 두 요일의 오전 8시까지 배출하며 공휴일에도 수거합니다.");
    },
    (number, variant) => {
      const target = pick(stationNames, variant);
      const transfer = pick(transferStations, Math.floor(variant / stationNames.length));
      return createQuestion("JLPT", number, "교통 안내",
        `工事中、快速電車は${text(target)}に止まりません。${text(target)}へ行く人は、一つ手前の${text(transfer)}で各駅停車に乗り換えてください。`,
        `${text(target)}へ行く人はどうしますか。`,
        `${text(transfer)}で各駅停車に乗り換える`, ["快速電車でそのまま行く", "工事が終わるまで待つ", "駅員を呼んで快速を止める"],
        "목적지 전 역에서 각역정차로 갈아타야 합니다.");
    },
    (number, variant) => {
      const clinic = pick(clinics, variant);
      const day = pick(weekdays, Math.floor(variant / clinics.length));
      const timeValue = pick(times, variant);
      return createQuestion("JLPT", number, "절차 이해",
        `${text(clinic)}の予約を変更したい場合は、${text(day)}の${text(timeValue)}までに電話してください。当日の変更はできません。`,
        "予約を変更したい人はどうしますか。",
        `${text(day)}の${text(timeValue)}までに電話する`, ["当日に受付へ直接行く", "診察券を郵便で送る", "連絡せず新しく予約する"],
        "예약 변경은 안내된 요일과 시각 전까지 전화로 해야 합니다.");
    },
    (number, variant) => {
      const product = pick(products, variant);
      const day = pick(weekdays, Math.floor(variant / products.length));
      return createQuestion("JLPT", number, "온라인 주문",
        `${text(product)}の届け先は、${text(day)}の発送前なら会員画面で変更できます。発送後は配送会社へ直接連絡してください。`,
        "発送後に住所を変えたいとき、何をしますか。",
        "配送会社へ直接連絡する", ["会員画面だけで変える", "商品を注文し直す", "商品が店へ戻るまで待つ"],
        "발송이 끝난 뒤에는 배송 회사에 직접 연락해야 합니다.");
    },
    (number, variant) => {
      const museum = pick(museums, variant);
      const day = pick(weekdays, Math.floor(variant / museums.length));
      return createQuestion("JLPT", number, "시설 안내",
        `${text(museum)}では、学生証を見せると入館料が半額になります。ただし、${text(day)}の午後は団体割引が適用されません。`,
        "学生が入館料を安くするために必要なものは何ですか。",
        "学生証を見せる", ["団体で予約する", "制服を着る", `${text(day)}の午後に行く`],
        "학생 할인을 받으려면 학생증을 제시해야 합니다.");
    },
  ];

  const jptGenerators = [
    (number, variant) => {
      const floor = pick(officeFloors, variant);
      const otherFloor = pick(officeFloors, variant + 2);
      const timeValue = pick(times, Math.floor(variant / officeFloors.length));
      return createQuestion("JPT", number, "업무 공지",
        `${text(floor)}のコピー機は${text(timeValue)}から修理を行います。作業中、急ぎの印刷がある方は${text(otherFloor)}の機械を使ってください。`,
        "修理中に印刷したい人はどうしますか。",
        `${text(otherFloor)}のコピー機を使う`, ["修理終了まで待つ", "修理会社へ連絡する", "印刷を明日に延期する"],
        "수리 중에는 안내된 다른 층의 복사기를 사용합니다.");
    },
    (number, variant) => {
      const city = pick(cities, variant);
      const timeValue = pick(times, Math.floor(variant / cities.length));
      const dept = pick(departments, variant);
      return createQuestion("JPT", number, "출장 일정",
        `${text(city)}出張の新幹線は${text(timeValue)}出発です。二十分前に改札前へ集合してください。切符と予約票は${text(dept)}が用意します。`,
        "出張する社員が自分で準備する必要がないものはどれですか。",
        "新幹線の切符", ["会議資料", "出張用の服", "駅までの交通手段"],
        "신칸센 표와 예약표는 담당 부서가 준비합니다.");
    },
    (number, variant) => {
      const amount = 300 + (variant % 6) * 100;
      const usable = 50 + Math.floor(variant / 6) * 50;
      const product = pick(products, variant);
      return createQuestion("JPT", number, "매장 안내",
        `${text(product)}を含む${amount}円の買い物につき一ポイントが付きます。ポイントは${usable}ポイントから使えます。金券の購入には付きません。`,
        "ポイントについて正しい説明はどれですか。",
        `${usable}ポイントから利用できる`, [`${amount}円で百ポイント付く`, "金券を買うと多く付く", "制度は来月から始まる"],
        "정해진 포인트 이상부터 사용할 수 있고 상품권 구매에는 적립되지 않습니다.");
    },
    (number, variant) => {
      const product = pick(products, variant);
      const day = pick(weekdays, Math.floor(variant / products.length));
      return createQuestion("JPT", number, "고객 대응",
        `${text(product)}は現在品切れですが、来週の${text(day)}に再入荷する予定です。取り置きを希望する場合は、名前と電話番号を返信してください。`,
        "商品を取り置いてもらうには何が必要ですか。",
        "名前と電話番号を返信する", ["店へ直接行く", "代金を先に払う", `${text(day)}にもう一度注文する`],
        "재입고 상품을 보관해 달라고 하려면 이름과 전화번호를 회신해야 합니다.");
    },
    (number, variant) => {
      const floor = pick(officeFloors, variant);
      const timeValue = pick(times, Math.floor(variant / officeFloors.length));
      return createQuestion("JPT", number, "시설 관리",
        `${text(floor)}の貯水槽清掃のため、${text(timeValue)}から正午まで水道が使えません。必要な水は事前に準備し、蛇口を閉めてください。`,
        "利用者が清掃前にすることは何ですか。",
        "必要な水を用意する", ["水道料金を払う", "正午まで外出する", "貯水槽を自分で洗う"],
        "단수 전에 필요한 물을 준비해야 합니다.");
    },
    (number, variant) => {
      const topic = pick(trainingTopics, variant);
      const day = pick(weekdays, Math.floor(variant / trainingTopics.length));
      const dept = pick(departments, variant);
      return createQuestion("JPT", number, "교육 신청",
        `${text(dept)}では${text(day)}に${text(topic)}を実施します。参加希望者は前日までに社内サイトで申し込んでください。定員を超えた場合は先着順です。`,
        "研修に参加したい社員はまず何をしますか。",
        "前日までに社内サイトで申し込む", ["当日会場へ直接行く", "上司に参加費を払う", "定員を超えるまで待つ"],
        "참가자는 전날까지 사내 사이트에서 신청해야 합니다.");
    },
    (number, variant) => {
      const item = pick(lostItems, variant);
      const floor = pick(officeFloors, Math.floor(variant / lostItems.length));
      return createQuestion("JPT", number, "분실물 안내",
        `${text(floor)}の受付に${text(item)}が届けられました。心当たりのある方は、社員証を持って受付へ来てください。`,
        "落とし物を受け取るために必要なものは何ですか。",
        "社員証", ["購入時の領収書", "受付からの電話", "新しい同じ商品"],
        "분실물을 찾을 때 사원증을 지참해야 합니다.");
    },
    (number, variant) => {
      const product = pick(products, variant);
      const timeValue = pick(times, Math.floor(variant / products.length));
      return createQuestion("JPT", number, "배송 안내",
        `${text(product)}は道路工事の影響で${text(timeValue)}ごろ到着する見込みです。受け取りが難しい場合は、配達状況画面から日時を変えられます。`,
        "予定時刻に商品を受け取れない人はどうしますか。",
        "配達状況画面で日時を変える", ["道路工事を中止させる", "営業所へ必ず行く", "注文を自動で取り消す"],
        "배송 현황 화면에서 수령 일시를 변경할 수 있습니다.");
    },
  ];

  const jtestGenerators = [
    (number, variant) => {
      const city = pick(cities, variant);
      const facility = pick(facilities, Math.floor(variant / cities.length));
      return createQuestion("J.TEST", number, "생활 정보",
        `${text(city)}では防災アプリで災害情報と避難所の場所を知らせます。通信が不安定な場合に備えて、${text(facility)}周辺の地図を事前に保存してください。`,
        "地図を事前に保存する理由は何ですか。",
        "通信できない場合に備えるため", ["避難所を増やすため", "混雑状況を市へ送るため", "アプリを軽くするため"],
        "재해 시 통신이 불안정할 경우에 대비하기 위한 것입니다.");
    },
    (number, variant) => {
      const venue = pick(venues, variant);
      const food = pick(foods, Math.floor(variant / venues.length));
      return createQuestion("J.TEST", number, "사회 주제",
        `${text(venue)}の店では${text(food)}などの食べ残しを減らすため、希望する客に持ち帰り用容器を渡しています。ただし、生ものと長時間室温に置かれた料理は対象外です。`,
        "この店で持ち帰れないものはどれですか。",
        "長時間室温にあった料理", ["十分に加熱した料理", "注文したばかりのパン", `${text(food)}と一緒に買った焼き菓子`],
        "생식품과 실온에 오래 놓인 음식은 포장할 수 없습니다.");
    },
    (number, variant) => {
      const station = pick(stationNames, variant);
      const day = pick(weekdays, Math.floor(variant / stationNames.length));
      return createQuestion("J.TEST", number, "규칙 이해",
        `${text(station)}の駅前では自転車の放置が増えています。短時間でも駐輪場を利用してください。${text(day)}から、放置自転車は警告札を付けた後に移動します。`,
        "放置された自転車はどうなりますか。",
        "警告後に移動される", ["その場で販売される", "無料で修理される", "駅員が自宅まで届ける"],
        "경고 표지를 부착한 뒤 이동 조치됩니다.");
    },
    (number, variant) => {
      const venue = pick(venues, variant);
      const day = pick(weekdays, Math.floor(variant / venues.length));
      return createQuestion("J.TEST", number, "환경 정보",
        `${text(venue)}に無料給水機を設置します。${text(day)}から利用できます。自分のボトルを持参し、衛生のため容器を給水口に触れさせないでください。`,
        "給水機を利用するときの注意は何ですか。",
        "容器を給水口に触れさせない", ["新しいボトルを必ず買う", "水を有料で購入する", "公園の外でだけ飲む"],
        "위생을 위해 용기가 급수구에 닿지 않게 해야 합니다.");
    },
    (number, variant) => {
      const station = pick(stationNames, variant);
      const product = pick(products, Math.floor(variant / stationNames.length));
      return createQuestion("J.TEST", number, "서비스 안내",
        `${text(station)}に宅配便の共用ロッカーを設置しました。${text(product)}などの荷物を受け取るには、配達会社から届く番号が必要です。到着から三日以内に受け取ってください。`,
        "ロッカーから荷物を受け取るために必要なものは何ですか。",
        "配達会社から届く番号", ["駅員の許可", "三日分の料金", "自宅の鍵"],
        "배송 회사가 보낸 번호가 필요합니다.");
    },
    (number, variant) => {
      const venue = pick(venues, variant);
      const day = pick(weekdays, Math.floor(variant / venues.length));
      return createQuestion("J.TEST", number, "행사 안내",
        `${text(day)}の朝、${text(venue)}で地域市場を開きます。地元の野菜や菓子を販売し、本の交換も行います。本の交換は予約不要です。`,
        "地域市場について正しいものはどれですか。",
        "地元の商品を買える", ["本の交換は予約制だ", "会場の中では販売しない", "夜だけ開く"],
        "지역 상품을 살 수 있고 책 교환은 예약이 필요 없습니다.");
    },
    (number, variant) => {
      const city = pick(cities, variant);
      const timeValue = pick(times, Math.floor(variant / cities.length));
      return createQuestion("J.TEST", number, "건강 정보",
        `${text(city)}では${text(timeValue)}ごろ気温が高くなります。暑い日は渇く前に水分を取り、屋内でも我慢せず冷房を使ってください。高齢者には周囲の人が声をかけましょう。`,
        "文章が最も伝えたいことは何ですか。",
        "水分と冷房で暑さに備える", ["屋内では熱中症にならない", "高齢者は外出禁止だ", "渇いてから水を飲めばよい"],
        "실내에서도 수분 섭취와 냉방으로 열사병을 예방해야 합니다.");
    },
    (number, variant) => {
      const topic = pick(trainingTopics, variant);
      const day = pick(weekdays, Math.floor(variant / trainingTopics.length));
      return createQuestion("J.TEST", number, "교육 주제",
        `${text(day)}の${text(topic)}では、授業中のスマートフォン使用を一律禁止しません。調べ学習に使う場合は、目的と時間を決めて学習を妨げない使い方を教えます。`,
        "筆者の考えに最も近いものはどれですか。",
        "目的を決めた適切な使用を教える", ["学校では常に使用を禁止する", "自由に好きなだけ使わせる", "紙の辞書をすべてなくす"],
        "전면 금지보다 목적이 있는 적절한 사용법을 가르치자는 내용입니다.");
    },
  ];

  const bjtGenerators = [
    (number, variant) => {
      const documentName = pick(documents, variant);
      const day = pick(weekdays, Math.floor(variant / documents.length));
      const dept = pick(departments, variant);
      return createQuestion("BJT", number, "업무 메일",
        `各位。${text(documentName)}の提出期限は${text(day)}ですが、${text(dept)}の確認時間を確保するため、完成した方は前日の正午までに共有フォルダへ保存してください。`,
        "このメールの主な目的は何ですか。",
        `${text(documentName)}の早めの共有を依頼する`, ["提出期限を来月に延ばす", `${text(dept)}の会議を中止する`, "新しいフォルダを作る"],
        "검토 시간을 확보하기 위해 문서를 일찍 공유하도록 요청하는 메일입니다.");
    },
    (number, variant) => {
      const product = pick(products, variant);
      const month = pick(months, Math.floor(variant / products.length));
      const nextMonth = pick(months, Math.floor(variant / products.length) + 1);
      return createQuestion("BJT", number, "회의록 이해",
        `${text(product)}は${text(month)}発売を目指していましたが、安全試験に追加確認が必要です。品質を優先して発売を${text(nextMonth)}に延期し、広告開始日も二週間後へ変更します。`,
        "会議で決まったことは何ですか。",
        "発売と広告を延期する", ["安全試験を中止する", "品質基準を下げる", `${text(month)}に広告だけ始める`],
        "추가 안전 확인을 위해 출시와 광고 일정을 함께 연기했습니다.");
    },
    (number, variant) => {
      const region = pick(regions, variant);
      const otherRegion = pick(regions, variant + 2);
      const increase = 8 + (variant % 6);
      const decrease = 1 + Math.floor(variant / 6);
      return createQuestion("BJT", number, "보고서 분석",
        `今期の売上は全体で前年を${increase}パーセント上回りました。特に${text(region)}は新規顧客が増えて伸びました。一方、${text(otherRegion)}は既存商品の不振で${decrease}パーセント減少しました。`,
        "報告内容と合うものはどれですか。",
        `${text(region)}の伸びが大きい`, ["全地域で売上が減った", `${text(otherRegion)}が最も伸びた`, "全体の売上は前年と同じだ"],
        "전체 매출은 증가했으며 지문에서 강조한 지역의 성장이 컸습니다.");
    },
    (number, variant) => {
      const documentName = pick(documents, variant);
      const day = pick(weekdays, Math.floor(variant / documents.length));
      return createQuestion("BJT", number, "거래처 연락",
        `先ほど送付した${text(documentName)}に消費税額の誤りがありました。訂正版を添付しますので、先のファイルは破棄してください。支払期限の${text(day)}に変更はありません。`,
        "受信者は何をする必要がありますか。",
        "最初の書類を破棄する", ["支払期限を変更する", "税額を自分で計算する", "支払いを中止する"],
        "오류가 있는 이전 파일은 폐기하고 정정본을 사용해야 합니다.");
    },
    (number, variant) => {
      const product = pick(products, variant);
      const city = pick(cities, Math.floor(variant / products.length));
      return createQuestion("BJT", number, "출장 보고",
        `${text(city)}の訪問先は${text(product)}の提案に関心を示しましたが、導入費用が予算を超えると指摘しました。次回は機能を絞った案と分割払いの条件を提示します。`,
        "次回の訪問で提示するものは何ですか。",
        "機能を限定した案と支払条件", ["より高機能な案だけ", "値引きなしの同じ案", "他社製品の比較表だけ"],
        "다음에는 기능을 줄인 안과 분할 납부 조건을 제시합니다.");
    },
    (number, variant) => {
      const product = pick(products, variant);
      const amount = 120 + (variant % 6) * 20;
      const region = pick(regions, Math.floor(variant / products.length));
      return createQuestion("BJT", number, "재고 조정",
        `${text(product)}の在庫は残り${amount}個です。大型店への通常配分を続けると${text(region)}の小型店で欠品が発生する恐れがあります。今週は各店舗へ同じ数量を送り、来週改めて需要を確認します。`,
        "会社は今週、商品をどのように配分しますか。",
        "各店舗へ同じ数量を送る", ["大型店だけに送る", "小型店への出荷を止める", "すべて倉庫に残す"],
        "이번 주에는 각 점포에 같은 수량을 배분합니다.");
    },
    (number, variant) => {
      const product = pick(products, variant);
      const day = pick(weekdays, Math.floor(variant / products.length));
      return createQuestion("BJT", number, "고객 불만 대응",
        `納品した${text(product)}の一部に傷があると連絡を受けました。まず${text(day)}中に交換品を発送し、不良品は後日回収します。原因調査の結果は一週間以内に報告します。`,
        "会社が最初に行う対応は何ですか。",
        "交換品を発送する", ["原因調査の報告書を送る", "全商品を回収する", "代金を返金する"],
        "첫 대응은 교환품을 발송하는 것입니다.");
    },
    (number, variant) => {
      const dept = pick(departments, variant);
      const month = pick(months, Math.floor(variant / departments.length));
      return createQuestion("BJT", number, "사무실 이전",
        `${text(dept)}の移転に伴い、${text(month)}から住所と代表電話番号が変わります。郵便物は三か月間転送されますが、取引先には今月中に新住所を案内してください。`,
        "社員は今月中に何をする必要がありますか。",
        "取引先へ新住所を知らせる", ["郵便物を自分で転送する", "代表電話を解約する", "移転を三か月延期する"],
        "거래처에는 이달 안에 새 주소를 안내해야 합니다.");
    },
  ];

  const generatorGroups = {
    JLPT: jlptGenerators,
    JPT: jptGenerators,
    "J.TEST": jtestGenerators,
    BJT: bjtGenerators,
  };

  Object.entries(generatorGroups).forEach(([exam, generators]) => {
    for (let number = 9; number <= 150; number += 1) {
      const offset = number - 9;
      const generator = generators[offset % generators.length];
      const variant = Math.floor(offset / generators.length);
      data.push(generator(number, variant));
    }
  });
}(typeof window !== "undefined" ? window : globalThis));
