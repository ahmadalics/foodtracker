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
let visionModel=null;
let lastImageReading=null;
let imageAlreadyCounted=false;
function clearImage(){uploadedFile=null;lastImageReading=null;imageAlreadyCounted=false;$('previewWrap').hidden=true;$('previewImage').removeAttribute('src');$('cameraInput').value='';$('galleryInput').value=''}
$('removeImage').addEventListener('click',clearImage);
async function receiveImage(file){if(!file)return;if(!file.type.startsWith('image/')){showMessage('يرجى اختيار ملف صورة صالح.');return}if(usage.image<=0){showMessage('انتهى رصيد فحص الصور لهذا اليوم. يعود الرصيد غداً.');return}uploadedFile=file;lastImageReading=null;imageAlreadyCounted=false;$('previewImage').src=URL.createObjectURL(file);$('previewName').textContent=file.name;$('previewWrap').hidden=false;try{await $('previewImage').decode()}catch{}$('checkButton').disabled=true;lastImageReading=await readImage();const recognizedName=inferProductName(lastImageReading);if(!$('productName').value.trim()&&recognizedName)$('productName').value=recognizedName;const name=$('productName').value.trim()||'المنتج المصوّر';const ingredients=$('ingredientsInput').value.trim();const imageData=`${lastImageReading.ocrText} ${lastImageReading.labels.join(' ')}`;usage.image--;imageAlreadyCounted=true;saveUsage();renderResult(name,analyze(`${name} ${ingredients} ${imageData}`),lastImageReading);$('checkButton').disabled=false}
$('cameraInput').addEventListener('change',e=>receiveImage(e.target.files[0]));
$('galleryInput').addEventListener('change',e=>receiveImage(e.target.files[0]));
function showMessage(text){$('result').innerHTML=`<p class="result-note">${text}</p>`}
function normalize(s){return s.toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/[ًٌٍَُِّْـ]/g,'').trim()}
function analyze(value){const input=normalize(value);const matches=[];for(const g of groups){const ingredients=g[2].filter(item=>input.includes(normalize(item)));if(ingredients.length)matches.push({group:g[1],ingredients})}return matches}
function escapeHtml(value){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function inferProductName(reading){if(!reading)return'';const firstLine=reading.ocrText.split(/[\n|]/).map(value=>value.trim()).find(value=>value.length>=3);if(firstLine)return firstLine.slice(0,80);if(reading.labels.length)return reading.labels[0].split(',')[0].trim();return''}
async function readImage(){
  const image=$('previewImage');
  const findings=[];
  let ocrText='';
  try{
    $('result').innerHTML='<p class="scan-progress">جاري قراءة النص من الصورة...</p>';
    const worker=await Tesseract.createWorker('ara+eng');
    const output=await worker.recognize(image);
    ocrText=(output.data.text||'').replace(/\s+/g,' ').trim();
    await worker.terminate();
  }catch(error){console.warn('OCR unavailable',error)}
  try{
    $('result').innerHTML='<p class="scan-progress">جاري التعرّف على الطعام في الصورة...</p>';
    if(!visionModel)visionModel=await mobilenet.load();
    const predictions=await visionModel.classify(image,5);
    predictions.filter(item=>item.probability>=.08).forEach(item=>findings.push(item.className));
  }catch(error){console.warn('Image classification unavailable',error)}
  return {ocrText,labels:[...new Set(findings)]};
}
function suggestions(matches){const names=matches.map(m=>m.group).join(' ');if(names.includes('الألبان'))return['حليب جوز الهند','حليب الأرز','حليب الشوفان الخالي من الجلوتين'];if(names.includes('الجلوتين'))return['خبز الأرز الخالي من الجلوتين','الكينوا','دقيق الذرة'];if(names.includes('البيض'))return['بديل البيض النباتي','بذور الكتان المطحونة مع الماء','مهروس الموز للخبز'];return['منتج بسيط المكونات وخالٍ من العناصر المذكورة','بديل منزلي بمكونات موثوقة','منتج يحمل ملصقاً واضحاً وخالياً من مسببات الحساسية']}
function imageReadingBlock(reading){if(!reading)return'';const visible=[reading.labels.join('، '),reading.ocrText].filter(Boolean).join(' — ');return `<div class="image-reading"><strong>ما تمّت قراءته من الصورة</strong><p>${visible?escapeHtml(visible):'لم نتمكن من قراءة تفاصيل واضحة. صوّري الملصق بإضاءة جيدة أو اكتبي المكونات يدوياً.'}</p></div>`}
function renderResult(name,matches,reading){const safeName=escapeHtml(name);const readingBlock=imageReadingBlock(reading);if(matches.length){const detected=[...new Set(matches.flatMap(m=>m.ingredients))];const tags=detected.map(item=>`<li>${escapeHtml(item)}</li>`).join('');const groupNames=matches.map(m=>m.group).join('، ');const alternatives=suggestions(matches).map(item=>`<li>• ${item}</li>`).join('');$('result').innerHTML=`<section class="result-card danger"><div class="result-head"><span class="result-mark">×</span><div><h3>ممنوع — لا تأكلي</h3><p class="product-name">${safeName}</p></div></div>${readingBlock}<h4>مكونات ممنوعة تم اكتشافها</h4><ul class="detected-tags">${tags}</ul><h4>تنبيه: مصادر خفية محتملة</h4><p class="section-copy">قد يحتوي هذا المنتج على مشتقات أو آثار مرتبطة بـ ${escapeHtml(groupNames)}. افحصي عبارات التحذير مثل «قد يحتوي على» و«مصنّع في منشأة».</p><h4>ملاحظات</h4><p class="section-copy">هذا المنتج غير مناسب بحسب الاسم والمكونات وما تمّت قراءته من الصورة. تجنبيه كلياً وتحققي دائماً من الملصق لأن التركيبات قد تتغير.</p><h4>بدائل آمنة مقترحة</h4><ul class="alternatives">${alternatives}</ul></section>`}else{$('result').innerHTML=`<section class="result-card safe"><div class="result-head"><span class="result-mark">✓</span><div><h3>لم نجد مكونات ممنوعة</h3><p class="product-name">${safeName}</p></div></div>${readingBlock}<h4>نتيجة الفحص</h4><p class="section-copy">لم نكتشف أياً من المجموعات الممنوعة في الاسم أو المكونات أو النص المقروء من الصورة.</p><h4>ملاحظات</h4><div class="result-note">يبدو مناسباً بحسب البيانات المتاحة، لكن افحصي العبوة كاملة وتأكدي من التحذيرات ومخاطر التلوث المتبادل قبل تناوله.</div></section>`}}
$('foodForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('productName').value.trim();const ingredients=$('ingredientsInput').value.trim();if(!name){showMessage('اسم المنتج مطلوب حتى يظهر بوضوح في نتيجة الفحص.');$('productName').focus();return}if(!ingredients&&!uploadedFile){showMessage('اكتبي المكونات أو ارفعي صورة المنتج لإجراء فحص مفيد.');return}const mode=uploadedFile?'image':'text';if(!imageAlreadyCounted&&usage[mode]<=0){showMessage('انتهى رصيد الفحص التجريبي لهذا اليوم. يعود الرصيد غداً.');return}$('checkButton').disabled=true;let reading=lastImageReading;if(uploadedFile&&!reading)reading=await readImage();else if(!uploadedFile)$('result').innerHTML='<p class="loading">جاري فحص المنتج والمكونات...</p>';if(!imageAlreadyCounted){usage[mode]--;saveUsage()}const imageData=reading?`${reading.ocrText} ${reading.labels.join(' ')}`:'';const matches=analyze(`${name} ${ingredients} ${imageData}`);renderResult(name,matches,reading);$('checkButton').disabled=false});
