/** Scene descriptions are newly written adaptations, not quotations or battle rules. */
export const MYTH_DURATION = 9000;
export const MYTH_STILLS = [1600, 4600, 8200] as const;
export type MythId = 12 | 14 | 15 | 19 | 24 | 29 | 32 | 36;
export type MythScene = {
  id: MythId; name: string; title: string; setting: string; colour: string;
  beats: readonly [string, string, string];
  description: string; adaptation: string; source?: { title: string; url: string };
};
export const MYTH_SCENES: readonly MythScene[] = [
  {id:12,name:'フェンリル',title:'ほどける終わり',setting:'雪原と、細い縛め',colour:'#a4d5c5',beats:['白い静けさに、一本の縛め。','大地を踏みしめ、縛めを断つ。','自由になった耳が、風を聞く。'],description:'雪の岩場。フェンリルが細い縛めに抗い、引きちぎる。ほどけた端が風に舞い、魔狼は顔を上げる。',adaptation:'グレイプニルは絹のように滑らかな縛め。終末に解放される伝承から、破縛の一瞬を創作。雪原と穏やかな結末は本作の演出です。',source:{title:'エッダ「ギュルヴィたぶらかし」',url:'https://sacred-texts.com/book/the-prose-edda/gylfaginning'}},
  {id:14,name:'玄武',title:'北の星を背に',setting:'冬の湖、亀と蛇',colour:'#a7d9d7',beats:['凍てた湖に、北の星。','甲羅が浮かび、蛇が身を起こす。','ふたつのまなざしが、冬を守る。'],description:'冬の星空の下、湖から玄武が姿を現す。甲羅の上で蛇が身を起こし、亀とともに静かに北を見守る。',adaptation:'亀と蛇、北方と冬という玄武のモチーフをもとにした創作場面。星の配置は星図の再現ではありません。',source:{title:'奈良文化財研究所「キトラ古墳壁画」',url:'https://www.nabunken.go.jp/shijin/about/kitora-atlas/mural/post.html'}},
  {id:15,name:'ヴリトラ',title:'閉ざされた河',setting:'岩の谷、解き放たれる水',colour:'#b6bef0',beats:['谷の水は、大蛇に塞がれていた。','インドラの雷に、囲いがほどける。','敗れた大蛇のかたわらを、河が走る。'],description:'ヴリトラが水を塞ぐ谷に、遠い雷光が落ちる。インドラに敗れる物語を象徴する静かな後退とともに、閉じ込められていた河が流れ出す。',adaptation:'リグ・ヴェーダ第1巻32歌では、インドラがヴリトラを倒して水を解放します。本作は流血を描かず、後退と水流で表現。ヴリトラの善行ではありません。',source:{title:'リグ・ヴェーダ 第1巻32歌',url:'https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda/Book_1/Hymn_32'}},
  {id:19,name:'タロス',title:'青銅の巡回',setting:'クレタの海辺',colour:'#efc896',beats:['潮風の向こう、島の朝。','青銅の足が、海岸を巡る。','石を携え、今日も島を見守る。'],description:'青銅のタロスがクレタ島の海岸を歩く。波しぶきのかかる岩を持ち上げ、遠い水平線へ向き直る。',adaptation:'クレタ島を巡回し、近づく船に石を投げる伝承が着想元。この場面は巡回と石を持つ仕草までを描く創作です。',source:{title:'アポロドロス「ビブリオテーケー」1.9.26',url:'https://www.theoi.com/Text/Apollodorus1.html'}},
  {id:24,name:'うつろ泉',title:'ひとしずくのともだち',setting:'小さな洞窟の泉',colour:'#e4c4dd',beats:['ぽつり。小さな泉に、ひとしずく。','まあるい波が、からだをくすぐる。','泡のともだちへ、おすそわけ。'],description:'洞窟の雫がうつろ泉の空洞へ落ちる。体がぷるんと揺れ、三つの小さな泡が泉から飛び出して寄り添う。',adaptation:'うつろ泉とこの物語はゲームオリジナルです。特定の神話や宗教の存在を描いたものではありません。'},
  {id:29,name:'マモン',title:'逃げた一枚',setting:'灯りの下の硬貨',colour:'#edd89a',beats:['ひとつ、ふたつ。積み上がる輝き。','ころころ。一枚だけ、逃げていく。','つかまえた。これだけは、手放さない。'],description:'灯りの下でマモンが硬貨を積む。一枚が転がると、袖を伸ばして受け止め、大事そうに手元へ戻す。',adaptation:'富やそれへの執着を人格化するマモンから着想した寓話。硬貨を追う出来事や服装は本作の創作で、伝承上の一場面ではありません。',source:{title:'Catholic Encyclopedia「Mammon」',url:'https://www.newadvent.org/cathen/09580b.htm'}},
  {id:32,name:'ドラウグル',title:'塚の静かな番人',setting:'月夜の古い塚',colour:'#ced4b4',beats:['月明かりが、塚の入口を照らす。','石が動き、眠りの番人が起きる。','宝を背に、夜の見張りが始まる。'],description:'月夜の塚で入口の石が動く。ドラウグルがゆっくりと起き上がり、残された宝を隠すように前へ立つ。',adaptation:'「グレティルのサガ」第18章の塚に住む死者と宝のモチーフをもとに、戦闘を描かない番人の場面を創作しています。',source:{title:'「グレティルのサガ」第18章',url:'https://www.gutenberg.org/cache/epub/12747/pg12747-images.html'}},
  {id:36,name:'ヤヌス',title:'はじまりの扉',setting:'夜明けの門',colour:'#f0d7a8',beats:['門のこちらと向こう、ふたつの顔。','鍵が回り、閉じた扉がひらく。','新しい朝が、敷居を越える。'],description:'薄明かりの門にヤヌスが立つ。鍵を回すと二枚の扉が開き、朝の光と小さな鳥が敷居を越える。',adaptation:'入口・始まり・二つの顔・鍵のモチーフから創作。夜明けは始まりの比喩で、時間移動を描いた場面ではありません。',source:{title:'オウィディウス「祭暦」第1巻',url:'https://www.theoi.com/Text/OvidFasti1.html'}},
];
export const mythScene = (id: number): MythScene | undefined => MYTH_SCENES.find(scene => scene.id === id);
export const mythBeat = (ms: number): 0 | 1 | 2 => ms < 2600 ? 0 : ms < 6200 ? 1 : 2;
export const clampMythTime = (ms: number) => Number.isFinite(ms) ? Math.max(0, Math.min(MYTH_DURATION, ms)) : 0;
