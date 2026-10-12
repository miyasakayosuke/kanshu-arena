/** Original game flavour and independently paraphrased tradition summaries.
 * Exact source evidence and qualifications: docs/monster-lore-sources.json.
 * Gameplay abilities and family classifications are not historical claims.
 */
export type MonsterStory = {
  id: number;
  name: string;
  flavour: string;
  origin: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  kind: 'tradition' | 'traditional-motif' | 'game-original';
  gameOriginal: boolean;
};

export const monsterStories: readonly MonsterStory[] = [
  {
    "id": 0,
    "name": "妖狐",
    "flavour": "すました顔で狐火をともす、夜道のいたずら好き。しっぽをほめると、火の勢いまで少し得意げ。",
    "origin": "日本の昔話などに出てくる、人に化けるふしぎなきつね。人をだます話もあれば、人を助ける話もある。",
    "sourceTitle": "University of Arkansas Museum・Japan · Folklore in Masks",
    "sourceUrl": "https://uamuseum.omeka.net/exhibits/show/folklore-in-masks/japan",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 1,
    "name": "トロル",
    "flavour": "大きな拳と、もっと大きな世話焼き心を持つ。仲間をかばって胸を張るが、せまい入口ではいつもつかえる。",
    "origin": "ノルウェーなど北ヨーロッパの言い伝えに出てくる、山や深い森にすむふしぎな生き物。大きな体で描かれることが多いが、小さいものや人を助けるものの話もある。",
    "sourceTitle": "Store norske leksikon・troll",
    "sourceUrl": "https://snl.no/troll",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 2,
    "name": "バステト",
    "flavour": "鈴を鳴らして、仲間の手当てにやってくる猫の守り手。仕事がすむと、いちばん日当たりのよい場所を探す。",
    "origin": "古代エジプトで信じられた、人々を守る女神。ねこの姿や、ねこの頭を持つ女性の姿で表される。",
    "sourceTitle": "The Metropolitan Museum of Art・Statuette of cat-headed Bastet",
    "sourceUrl": "https://www.metmuseum.org/art/collection/search/558306",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 3,
    "name": "ドリュアス",
    "flavour": "古い森から歩いてきた、枝葉をまとう木の精。仲間にはやさしいが、小枝を折る相手には少々手きびしい。",
    "origin": "ギリシャ神話に登場する、木や森にすむ女性の精霊（せいれい）。木と命がつながり、木が枯れるとともに命を終える仲間もいる。",
    "sourceTitle": "Theoi Project・Dryades & Oreiades: Tree and Mountain Nymphs",
    "sourceUrl": "https://www.theoi.com/Nymphe/Dryades.html",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 4,
    "name": "バンシー",
    "flavour": "霧の向こうから、よく通る声がひびいてくる。本人は静かに話したつもりでも、仲間は思わず耳をふさぐ。",
    "origin": "アイルランドの言い伝えに登場する、女性の姿をしたふしぎな存在。ある家族のだれかに死が近づくと、悲しい泣き声で知らせるといわれる。",
    "sourceTitle": "Dúchas / National Folklore Collection, University College Dublin・An Bhean Sí · Cnoc an Teampaill · The Schools’ Collection",
    "sourceUrl": "https://www.duchas.ie/en/cbes/5070782/5062823/5094463",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 5,
    "name": "ケツァルコアトル",
    "flavour": "色とりどりの羽をひるがえす、空の旅人。風を起こしたあとも、乱れた羽の手入れだけは忘れない。",
    "origin": "今のメキシコにあたる地域で信じられた、「羽毛のあるへび」という名の神。アステカの神話では、人を生み出した神の一人で、風の神としての姿も持つ。",
    "sourceTitle": "Vatican Museums・Quetzalcóatl",
    "sourceUrl": "https://www.museivaticani.va/content/museivaticani/en/collezioni/musei/museo-etnologico/collezione/quetzalcoatl.html",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 6,
    "name": "ガルーダ",
    "flavour": "高い空から戦場を見わたす、翼自慢の戦士。着地もかっこよく決めたいので、足元の小石が少し気になる。",
    "origin": "インドのヒンドゥー教の神話に出てくる、神ヴィシュヌを乗せて飛ぶ大きな鳥。人と鳥を合わせた姿で表されることもある。",
    "sourceTitle": "The Metropolitan Museum of Art・Garuda (Vishnu's Mount) Seated in Royal Ease",
    "sourceUrl": "https://www.metmuseum.org/art/collection/search/38134",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 7,
    "name": "セルキー",
    "flavour": "潮の香りを連れてくる、のんびりした海の仲間。手当てのあとにひと泳ぎするのが、いちばんの楽しみ。",
    "origin": "スコットランドの島々などに伝わる、アザラシと人の姿を行き来するふしぎな存在。陸ではアザラシの皮をぬいで人になり、その皮を失うと海へ帰れないといわれる。",
    "sourceTitle": "Historic Environment Scotland・Orkney’s Legends: 5 Orcadian folktales from The Outrun",
    "sourceUrl": "https://blog.historicenvironment.scot/2024/09/orkney-folktales-the-outrun/",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 8,
    "name": "イフリート",
    "flavour": "炎をまとった、見るからに熱そうな力自慢。気合いを入れるたび火の粉が散るので、仲間は少し離れて応援する。",
    "origin": "アラビアやイスラム教の伝承に出てくる、ジンというふしぎな存在のうち、強い力を持つもの。『コーラン』では、女王の王座を遠くから運べると申し出る。",
    "sourceTitle": "TDV İslâm Ansiklopedisi / İslâm Araştırmaları Merkezi・İFRİT",
    "sourceUrl": "https://islamansiklopedisi.org.tr/ifrit",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 9,
    "name": "烏天狗",
    "flavour": "山道をひと飛びで渡る、身軽な案内役。近道を教えるのは得意だが、翼のない仲間がついてこられるかは忘れがち。",
    "origin": "日本の山の言い伝えに登場する、天狗の仲間。鳥のようなくちばしとつばさを持ち、空を自由に飛ぶといわれる。",
    "sourceTitle": "曹洞宗 大雄山最乗寺・天狗伝説",
    "sourceUrl": "https://daiyuuzan.or.jp/plan/tengu/",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 10,
    "name": "ナーガ",
    "flavour": "長い体を輪にして、仲間のそばに陣取る。守りは頼もしいが、休憩場所を決めるときは少し場所を取る。",
    "origin": "インドのヒンドゥー教や仏教に登場する、へびの姿を持つふしぎな存在。水と深く結びつき、土地を守る神としても信じられてきた。",
    "sourceTitle": "University of Michigan Museum of Art・Nagaraja (Serpent king)",
    "sourceUrl": "https://umma.umich.edu/objects/nagaraja-serpent-king-2002-2-350/",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 11,
    "name": "アヌビス",
    "flavour": "静かに構える、まじめな境目の番人。見張り中はきりりとしているが、仲間の帰りには耳がぴんと立つ。",
    "origin": "古代エジプトで、ミイラ作りにかかわり、死者を守る神。ジャッカルという犬に似た動物や、その頭を持つ人の姿で表される。",
    "sourceTitle": "Kelsey Museum of Archaeology, University of Michigan・Anubis: Embalmer and Protector of the Dead",
    "sourceUrl": "https://exhibitions.kelsey.lsa.umich.edu/jackal-gods-ancient-egypt/anubis.php",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 12,
    "name": "フェンリル",
    "flavour": "切れた鎖を鳴らし、先頭を駆ける大きな狼。こわい顔で振り返るのは、仲間がちゃんと来ているか気になるから。",
    "origin": "北欧神話に登場する、ロキの子である巨大なオオカミ。神々に特別なひもでしばられ、世界の終わりの戦いで自由になる。",
    "sourceTitle": "『エッダ』ギュルヴィたぶらかし",
    "sourceUrl": "https://sacred-texts.com/book/the-prose-edda/gylfaginning",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 13,
    "name": "ラタトスク",
    "flavour": "枝から枝へ走り回る、小さな伝令役。木の実は弾にもおやつにもなるので、使う順番がなやましい。",
    "origin": "北欧神話の世界樹ユグドラシルを走るリス。木の上のワシと根元の大蛇の間を行き来し、たがいを怒らせる言葉を運ぶ。",
    "sourceTitle": "『エッダ』ギュルヴィたぶらかし",
    "sourceUrl": "https://sacred-texts.com/book/the-prose-edda/gylfaginning",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 14,
    "name": "玄武",
    "flavour": "どっしり構えた甲羅と、くるりと巻いた蛇が目印。急ぐときほど落ち着いて、という教えを、今日ものんびり守っている。",
    "origin": "古代中国から伝わる、北の方角を守る神獣。四神の一つで、ふつうは亀に蛇がからみついた姿で描かれる。",
    "sourceTitle": "奈良文化財研究所・キトラ古墳の玄武",
    "sourceUrl": "https://www.nabunken.go.jp/shijin/about/kitora-atlas/mural/post.html",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 15,
    "name": "ヴリトラ",
    "flavour": "大きな体を巻き、じっと力をためる竜。考えごとをしているように見えるが、ほどく順番を確かめているだけかもしれない。",
    "origin": "古代インドの『リグ・ヴェーダ』に登場する、水をせき止めた大蛇。雷の神インドラに倒されると、とらわれていた水が流れ出す。",
    "sourceTitle": "『リグ・ヴェーダ』第1巻32歌",
    "sourceUrl": "https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda/Book_1/Hymn_32",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 16,
    "name": "リンドヴルム",
    "flavour": "長い体をくねらせて、仲間の前にすべりこむ。たのもしい鱗の持ち主だが、寝床にはどうしても長い場所がいる。",
    "origin": "ヨーロッパの伝説に登場する、長い蛇の体を持つ竜。オーストリアのクラーゲンフルトでは、沼にすみ人や家畜を襲ったと語られる。",
    "sourceTitle": "クラーゲンフルト市・リンドヴルムの伝説",
    "sourceUrl": "https://www.klagenfurt.at/stadtinfo/geschichte-persoenlichkeiten/sagen",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 17,
    "name": "アンフィスバエナ",
    "flavour": "前から見ても後ろから見ても、牙のある顔。見張りのすきは少ないが、行き先の相談には少し時間がかかる。",
    "origin": "古代ギリシャやローマで語られた、体の両はしに頭を持つ蛇。しっぽ側の頭を先にしても進めるという。",
    "sourceTitle": "アイリアノス／プリニウスの古代文献",
    "sourceUrl": "https://www.theoi.com/Thaumasios/Amphisbainai.html",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 18,
    "name": "ジラント",
    "flavour": "淡い雲を連れて旅する、青緑の翼の竜。仲間には水を分けてくれるが、自慢の翼がぬれると念入りに乾かす。",
    "origin": "タタールの伝説に登場する、翼を持つ大蛇。ロシアのカザンにまつわる物語で語られ、町のシンボルにもなっている。",
    "sourceTitle": "カザン公式観光案内・ジラント",
    "sourceUrl": "https://go.kzn.ru/articles/kazan-misticeskaia",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 19,
    "name": "タロス",
    "flavour": "重い足音で歩く、青銅の体の番人。仲間の手入れには熱心だが、自分のきしむひじは後回し。",
    "origin": "ギリシャ神話でクレタ島を守る、青銅の体の番人。毎日島を見回り、近づく船へ大きな石を投げたという。",
    "sourceTitle": "アポロドロス『ビブリオテーケー』1.9.26",
    "sourceUrl": "https://www.theoi.com/Text/Apollodorus1.html",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 20,
    "name": "唐傘おばけ",
    "flavour": "古びた傘が、ひょいと闘技場へやってきた。雨の日は張り切るけれど、晴れていても帰るつもりはないらしい。",
    "origin": "日本の妖怪画に見られる、傘が化けたような妖怪。古い絵には、傘の頭に人のような体を持つ姿も描かれている。",
    "sourceTitle": "国際日本文化研究センター・傘の妖怪",
    "sourceUrl": "https://www.nichibun.ac.jp/YoukaiGazouCard/U426_nichibunken_0452_0001_0007.html",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 21,
    "name": "ぬりかべ",
    "flavour": "仲間の前へ、ずずっと動く石の壁。あいさつのつもりで近づいても、通せんぼだと思われがち。",
    "origin": "日本の福岡などに伝わる、夜道をふさぐ壁のような妖怪。下のほうを棒で払うと消える、という話が残っている。",
    "sourceTitle": "国際日本文化研究センター・塗り壁",
    "sourceUrl": "https://www.nichibun.ac.jp/cgi-bin/YoukaiDB3/youkai_card.cgi?ID=2180774",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 22,
    "name": "巡る三脚鼎",
    "flavour": "ことこと湯気を立てながら、三つの車輪で走る器。仲間の手当てに急ぎたいけれど、曲がり角ではこぼさぬよう慎重に。",
    "origin": "ギリシャ神話の、ひとりでに走る三脚の器がもと。鍛冶の神ヘパイストスが作って神々の集まりを行き来する器で、この名前と回復役の設定は本作の創作。",
    "sourceTitle": "ホメロス『イリアス』第18巻",
    "sourceUrl": "https://www.theoi.com/Olympios/HephaistosWorks.html",
    "kind": "traditional-motif",
    "gameOriginal": false
  },
  {
    "id": 23,
    "name": "青銅の牡牛",
    "flavour": "どしんと踏み出す、重たい青銅の力自慢。角の手入れは欠かさないが、自分のおでこをみがくのは少し苦手。",
    "origin": "ギリシャ神話の、火を吐く牛がもと。鍛冶の神が作った青銅の足と口を持つ牛で、英雄イアソンが畑を耕す試練で向き合う。",
    "sourceTitle": "アポロニオス『アルゴナウティカ』第3巻",
    "sourceUrl": "https://www.theoi.com/Text/ApolloniusRhodius3.html",
    "kind": "traditional-motif",
    "gameOriginal": false
  },
  {
    "id": 24,
    "name": "うつろ泉",
    "flavour": "ぽっかり空いた体に、静かな水をたたえる。仲間に力を分ける気前のよさと、自分の分を残す用心深さを両立したい。",
    "origin": "このゲームのために作られた、泉のような体に水をたたえる生きもの。特定の神話や昔話に由来するモンスターではない。",
    "sourceTitle": null,
    "sourceUrl": null,
    "kind": "game-original",
    "gameOriginal": true
  },
  {
    "id": 25,
    "name": "ひも雫",
    "flavour": "ほどけたひものように、するすると走る小さな雫。急ぐあまりに体が長くのび、到着してからうしろの端を待つことも。",
    "origin": "このゲームのために作られた、細い水のひもの形をした生きもの。特定の神話や昔話に由来するモンスターではない。",
    "sourceTitle": null,
    "sourceUrl": null,
    "kind": "game-original",
    "gameOriginal": true
  },
  {
    "id": 26,
    "name": "ひだまもり",
    "flavour": "何枚ものひだを広げ、仲間を包むやわらかな守り手。きれいにたたむのが好きで、休憩中もせっせと折り目を直す。",
    "origin": "このゲームのために作られた、やわらかな膜を何枚も重ねた生きもの。特定の神話や昔話に由来するモンスターではない。",
    "sourceTitle": null,
    "sourceUrl": null,
    "kind": "game-original",
    "gameOriginal": true
  },
  {
    "id": 27,
    "name": "あわ枝",
    "flavour": "枝の先に泡を実らせた、水辺の世話焼き。仲間に渡す泡を選ぶ様子は、くだもの屋さんのように真剣だ。",
    "origin": "このゲームのために作られた、泡でできた枝を伸ばす生きもの。特定の神話や昔話に由来するモンスターではない。",
    "sourceTitle": null,
    "sourceUrl": null,
    "kind": "game-original",
    "gameOriginal": true
  },
  {
    "id": 28,
    "name": "ねりこぶし",
    "flavour": "六つのこぶを、ぎゅっとまとめる力自慢。やわらかそうと油断すると重い一撃が飛んでくるので、つつくのはほどほどに。",
    "origin": "このゲームのために作られた、六つのこぶを持つ、ねりもののような生きもの。特定の神話や昔話に由来するモンスターではない。",
    "sourceTitle": null,
    "sourceUrl": null,
    "kind": "game-original",
    "gameOriginal": true
  },
  {
    "id": 29,
    "name": "マモン",
    "flavour": "指先で勘定を続ける、頭巾姿の抜け目ないやつ。敵の力の残りには細かいが、仲間のおやつ代まで数えたがるのが玉にきず。",
    "origin": "もとは富や財産を意味する言葉。キリスト教の伝統では、お金への欲を一人の存在に見立て、悪魔として描くようにもなった。",
    "sourceTitle": "『カトリック百科事典』マモン",
    "sourceUrl": "https://www.newadvent.org/cathen/09580b.htm",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 30,
    "name": "コボルト",
    "flavour": "工具を抱えた、小さな仕事人。ゆるんだ留め具を見つけるのが得意で、敵の守りにもつい手を出してしまう。",
    "origin": "ドイツの昔話に登場する、家にすみつく小さな精霊。家事を手伝ってくれる一方、怒らせるといたずらをするという。",
    "sourceTitle": "グリム『ドイツ伝説集』コボルト",
    "sourceUrl": "https://de.wikisource.org/wiki/Der_Kobold_(Br%C3%BCder_Grimm)",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 31,
    "name": "エンプーサ",
    "flavour": "片脚をきらりと光らせ、影のように身をひるがえす。足音をひそめたいのに、かたい脚がこつんと鳴るのが悩み。",
    "origin": "古代ギリシャで語られた、さまざまな姿に変わる怪物。喜劇『蛙』では、片脚が青銅でできていると語られる。",
    "sourceTitle": "アリストパネス『蛙』大学公開訳",
    "sourceUrl": "https://web.viu.ca/johnstoi/aristophanes/frogs.htm",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 32,
    "name": "ドラウグル",
    "flavour": "墓の土を肩にのせた、無口で力の強い古参。長く眠っていたせいか、集合の合図だけは少し大きな声で伝えたい。",
    "origin": "北欧の古い物語に現れる、体を持ったまま動く死者。墓の中の宝を守り、近づいた人に襲いかかる話が残っている。",
    "sourceTitle": "『グレティルのサガ』第18章",
    "sourceUrl": "https://www.gutenberg.org/cache/epub/12747/pg12747-images.html",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 33,
    "name": "首なしの馭者",
    "flavour": "顔の代わりにあかりをかかげ、夜道を進む馬車の運転手。うなずけないぶん、返事は手綱（たづな）の動きでしっかり伝える。",
    "origin": "アイルランドに伝わる、首のない者が走らせる死の馬車がもと。出会うことは、死や不幸が近いしるしだと考えられた。",
    "sourceTitle": "クローカー『アイルランド南部の妖精伝説』",
    "sourceUrl": "https://www.gutenberg.org/cache/epub/39752/pg39752-images.html",
    "kind": "traditional-motif",
    "gameOriginal": false
  },
  {
    "id": 34,
    "name": "キョンシー",
    "flavour": "小さく跳ねて進む、長い袖の持ち主。仲間をかばうときも真顔だが、袖の内側はなかなか居心地がよい。",
    "origin": "中国の怪談に登場する、動き出した死体。清の時代の『子不語』には、ぴょんぴょん跳ぶものも描かれている。",
    "sourceTitle": "袁枚『子不語』巻8「批僵屍頰」",
    "sourceUrl": "https://zh.wikisource.org/wiki/%E5%AD%90%E4%B8%8D%E8%AA%9E/%E5%8D%B78",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 35,
    "name": "ヴェータラ",
    "flavour": "枝から逆さに下がり、影のほつれを縫う小さな仲間。上下が逆でも手先は器用で、糸くずだけはよく頭に落ちてくる。",
    "origin": "インドの物語に登場する、死体に宿る霊。王に運ばれながら不思議な話をして、最後になぞを出す物語で知られる。",
    "sourceTitle": "ソーマデーヴァ『説話の大海』第75章",
    "sourceUrl": "https://en.wikisource.org/wiki/The_Katha_Sarit_Sagara/Chapter_75",
    "kind": "tradition",
    "gameOriginal": false
  },
  {
    "id": 36,
    "name": "ヤヌス",
    "flavour": "二つの顔で行き来を見守る、律義な門番。どちら側から声をかけても返事はするが、同時に話しかけられると少し困る。",
    "origin": "古代ローマの、門や物事の始まりをつかさどる神。前と後ろを同時に見られる、二つの顔を持つ姿で表される。",
    "sourceTitle": "オウィディウス『祭暦』第1巻",
    "sourceUrl": "https://www.theoi.com/Text/OvidFasti1.html",
    "kind": "tradition",
    "gameOriginal": false
  }
];

const unknownStory: MonsterStory = {
  id: -1, name: '', flavour: 'まだ物語の記されていない幻獣。',
  origin: '', sourceTitle: null, sourceUrl: null, kind: 'game-original', gameOriginal: true,
};

export function monsterStory(id: number): MonsterStory {
  return monsterStories[id] ?? unknownStory;
}
