const groups = [
  ['🌾','الجلوتين والقمح',['القمح','الشعير','الشوفان','الجاودار','السبيلت','الكاموت','خبز','معكرونة','برغل','سميد','فريكة','كسكس','مفتول','gluten','wheat','oats']],
  ['🥛','كل الألبان',['حليب','جبنة','جبن','لبنة','لبن','زبادي','زبدة','قشدة','آيس كريم','كريمة','مصل الحليب','whey','milk','cheese','yogurt','dairy']],
  ['🌱','الصويا',['صويا','توفو','ليسيثين الصويا','e322','soy','tofu']],
  ['🍅','البندورة المعقودة',['معجون الطماطم','معجون البندورة','صلصة البندورة','صلصة الطماطم','كاتشاب','صلصة البيتزا','tomato paste','ketchup']],
  ['🫘','كل البقوليات',['حمص','عدس','فول','فاصولياء','فاصوليا','بازلاء','لوبيا','ترمس','فول سوداني','legume','lentil','chickpea','peanut']],
  ['🌰','كل المكسرات',['لوز','جوز','كاجو','بندق','فستق','صنوبر','ماكاداميا','بقان','almond','walnut','cashew','pistachio','nuts']],
  ['🌻','السمسم',['سمسم','طحينة','حلاوة','زيت السمسم','sesame','tahini']],
  ['🥚','البيض',['بيض','مايونيز','كاسترد','egg','mayonnaise','custard']],
  ['🍋','فواكه ممنوعة',['ليمون','فراولة','تفاح','مشمش','قمر الدين','كيوي','أناناس','lemon','strawberry','apple','apricot','kiwi','pineapple']],
  ['🥦','خضروات',['هليون','asparagus']],
  ['🦐','مأكولات بحرية قشرية',['جمبري','روبيان','محار','سلطعون','استاكوزا','سمك القد','بولوك','حبار','أبو سيف','سمك الفرخ','shrimp','prawn','crab','lobster','cod','pollock','squid','calamari','swordfish']],
  ['🐰','لحم الأرانب',['أرنب','ارنب','rabbit']],
  ['🍁','شراب القيقب',['شراب القيقب','شراب المابل','maple syrup']]
];
const $ = (id) => document.getElementById(id);
const foodList = $('foodList');
groups.forEach((g,i)=>{const article=document.createElement('article');article.className='food-group';article.innerHTML=`<h3>${g[0]} ${i+1}. ${g[1]}</h3><p>${g[2].slice(0,10).join('، ')}</p>`;foodList.appendChild(article)});

const dayKey = new Date().toISOString().slice(0,10);
let usage;
try { usage=JSON.parse(localStorage.getItem('foodtracker-usage')) } catch { usage=null }
if(!usage || usage.day!==dayKey) usage={day:dayKey,image:10,text:10};
function saveUsage(){localStorage.setItem('foodtracker-usage',JSON.stringify(usage));$('imageCount').textContent=usage.image;$('textCount').textContent=usage.text}
saveUsage();

$('listToggle').addEventListener('click',()=>{const open=foodList.hidden;foodList.hidden=!open;$('listToggle').setAttribute('aria-expanded',String(open));$('arrow').textContent=open?'▲':'▼'});
let uploadedFile=null;
function clearImage(){uploadedFile=null;$('previewWrap').hidden=true;$('previewImage').removeAttribute('src');$('cameraInput').value='';$('galleryInput').value=''}
$('removeImage').addEventListener('click',clearImage);
function receiveImage(file){if(!file)return;if(!file.type.startsWith('image/')){showMessage('يرجى اختيار ملف صورة صالح.');return}uploadedFile=file;$('previewImage').src=URL.createObjectURL(file);$('previewName').textContent=file.name;$('previewWrap').hidden=false;$('productName').focus()}
$('cameraInput').addEventListener('change',e=>receiveImage(e.target.files[0]));
$('galleryInput').addEventListener('change',e=>receiveImage(e.target.files[0]));
function showMessage(text){$('result').innerHTML=`<p class="result-note">${text}</p>`}
function normalize(s){return s.toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/[ًٌٍَُِّْـ]/g,'').trim()}
function analyze(value){const input=normalize(value);const matches=[];for(const g of groups){const ingredients=g[2].filter(item=>input.includes(normalize(item)));if(ingredients.length)matches.push({group:g[1],ingredients})}return matches}
function escapeHtml(value){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function suggestions(matches){const names=matches.map(m=>m.group).join(' ');if(names.includes('الألبان'))return['حليب جوز الهند','حليب الأرز','حليب الشوفان الخالي من الجلوتين'];if(names.includes('الجلوتين'))return['خبز الأرز الخالي من الجلوتين','الكينوا','دقيق الذرة'];if(names.includes('البيض'))return['بديل البيض النباتي','بذور الكتان المطحونة مع الماء','مهروس الموز للخبز'];return['منتج بسيط المكونات وخالٍ من العناصر المذكورة','بديل منزلي بمكونات موثوقة','منتج يحمل ملصقاً واضحاً وخالياً من مسببات الحساسية']}
function renderResult(name,matches){const safeName=escapeHtml(name);if(matches.length){const detected=[...new Set(matches.flatMap(m=>m.ingredients))];const tags=detected.map(item=>`<li>${escapeHtml(item)}</li>`).join('');const groupNames=matches.map(m=>m.group).join('، ');const alternatives=suggestions(matches).map(item=>`<li>• ${item}</li>`).join('');$('result').innerHTML=`<section class="result-card danger"><div class="result-head"><span class="result-mark">×</span><div><h3>ممنوع — لا تأكلي</h3><p class="product-name">${safeName}</p></div></div><h4>مكونات ممنوعة تم اكتشافها</h4><ul class="detected-tags">${tags}</ul><h4>تنبيه: مصادر خفية محتملة</h4><p class="section-copy">قد يحتوي هذا المنتج على مشتقات أو آثار مرتبطة بـ ${escapeHtml(groupNames)}. افحصي عبارات التحذير مثل «قد يحتوي على» و«مصنّع في منشأة».</p><h4>ملاحظات</h4><p class="section-copy">هذا المنتج غير مناسب بحسب قائمة المكونات المدخلة. تجنبيه كلياً وتحققي دائماً من الملصق لأن التركيبات قد تتغير.</p><h4>بدائل آمنة مقترحة</h4><ul class="alternatives">${alternatives}</ul></section>`}else{$('result').innerHTML=`<section class="result-card safe"><div class="result-head"><span class="result-mark">✓</span><div><h3>لم نجد مكونات ممنوعة</h3><p class="product-name">${safeName}</p></div></div><h4>نتيجة الفحص</h4><p class="section-copy">لم نكتشف أياً من المجموعات الممنوعة في الاسم أو المكونات التي أدخلتها.</p><h4>ملاحظات</h4><div class="result-note">يبدو مناسباً بحسب البيانات المكتوبة، لكن افحصي العبوة كاملة وتأكدي من التحذيرات ومخاطر التلوث المتبادل قبل تناوله.</div></section>`}}
$('foodForm').addEventListener('submit',e=>{e.preventDefault();const name=$('productName').value.trim();const ingredients=$('ingredientsInput').value.trim();if(!name){showMessage('اسم المنتج مطلوب حتى يظهر بوضوح في نتيجة الفحص.');$('productName').focus();return}if(!ingredients&&!uploadedFile){showMessage('اكتبي المكونات أو ارفعي صورة المنتج لإجراء فحص مفيد.');return}const mode=uploadedFile?'image':'text';if(usage[mode]<=0){showMessage('انتهى رصيد الفحص التجريبي لهذا اليوم. يعود الرصيد غداً.');return}const source=`${name} ${ingredients}`;usage[mode]--;saveUsage();$('checkButton').disabled=true;$('result').innerHTML='<p class="loading">جاري فحص المنتج والمكونات...</p>';setTimeout(()=>{renderResult(name,analyze(source));$('checkButton').disabled=false;if(uploadedFile)clearImage()},850)});
