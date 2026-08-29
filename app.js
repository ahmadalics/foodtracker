const groups = [
  ['🌾','الجلوتين والقمح',['القمح','الشعير','الشوفان','الجاودار','السبيلت','الكاموت','خبز','معكرونة','برغل','سميد','فريكة','كسكس','مفتول','بسكويت القمح','بسكويت دايجستف','دايجستف','gluten','wheat','wheat biscuit','digestive biscuit','digestives','mcvities','oats']],
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
groups.forEach((g,i)=>{const article=document.createElement('article');article.className='food-group';article.innerHTML=`<h3>${g[0]} ${i+1}. ${g[1]}</h3><p>${g[2].join('، ')}</p>`;foodList.appendChild(article)});

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
async function receiveImage(file){if(!file)return;if(!file.type.startsWith('image/')){showMessage('يرجى اختيار ملف صورة صالح.');return}if(usage.image<=0){showMessage('انتهى رصيد فحص الصور لهذا اليوم. يعود الرصيد غداً.');return}uploadedFile=file;lastImageReading=null;imageAlreadyCounted=false;$('previewImage').src=URL.createObjectURL(file);$('previewName').textContent=file.name;$('previewWrap').hidden=false;try{await $('previewImage').decode()}catch{}$('checkButton').disabled=true;lastImageReading=await readImage();const recognizedName=inferProductName(lastImageReading);if(!$('productName').value.trim()&&recognizedName)$('productName').value=recognizedName;const name=$('productName').value.trim()||'المنتج المصوّر';const ingredients=$('ingredientsInput').value.trim();const imageData=`${lastImageReading.ocrText} ${lastImageReading.labels.join(' ')}`;const matches=analyze(`${name} ${ingredients} ${imageData}`);usage.image--;imageAlreadyCounted=true;saveUsage();if(matches.length)renderResult(name,matches,lastImageReading);else if(!hasReliableEvidence(name,ingredients,lastImageReading))renderUncertain(name,lastImageReading);else renderResult(name,matches,lastImageReading);$('checkButton').disabled=false}
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
  let ocrConfidence=0;
  try{
    $('result').innerHTML='<p class="scan-progress">جاري قراءة النص من الصورة...</p>';
    const worker=await Tesseract.createWorker('ara+eng');
    const output=await worker.recognize(image);
    ocrConfidence=Number(output.data.confidence||0);
    ocrText=cleanOcrText(output.data.text||'',ocrConfidence);
    await worker.terminate();
  }catch(error){console.warn('OCR unavailable',error)}
  try{
    $('result').innerHTML='<p class="scan-progress">جاري التعرّف على الطعام في الصورة...</p>';
    if(!visionModel)visionModel=await mobilenet.load();
    const predictions=await visionModel.classify(image,5);
    predictions.filter(item=>item.probability>=.08).forEach(item=>findings.push(item.className));
  }catch(error){console.warn('Image classification unavailable',error)}
  return {ocrText,ocrConfidence,labels:[...new Set(findings)]};
}
function cleanOcrText(text,confidence){if(confidence<38)return'';const words=text.replace(/[^\u0600-\u06FFa-zA-Z0-9%.,()\-\s]/g,' ').split(/\s+/).filter(word=>word.length>=2||/^[0-9]+%?$/.test(word));const meaningful=words.filter(word=>/[\u0600-\u06FFa-zA-Z]{2}/.test(word)||/^[0-9]+%?$/.test(word));return meaningful.join(' ').slice(0,360)}
function friendlyLabels(labels){const map={fig:'تين',milk:'حليب',yogurt:'زبادي',cheese:'جبنة',bread:'خبز',banana:'موز',orange:'برتقال',lemon:'ليمون',pineapple:'أناناس',strawberry:'فراولة',apple:'تفاح',broccoli:'بروكلي',cucumber:'خيار',mushroom:'فطر',pizza:'بيتزا',icecream:'آيس كريم'};return labels.map(label=>{const first=label.split(',')[0].trim();const key=Object.keys(map).find(item=>first.toLowerCase().includes(item));return key?map[key]:first}).filter(Boolean)}
function hasReliableEvidence(name,ingredients,reading){return Boolean(ingredients.trim()||(reading&&reading.ocrText&&reading.ocrConfidence>=38)||(reading&&reading.labels&&reading.labels.length))}
function suggestions(matches){const names=matches.map(m=>m.group).join(' ');if(names.includes('الألبان'))return['حليب جوز الهند','حليب الأرز','حليب الشوفان الخالي من الجلوتين','منتج نباتي معتمد خالٍ من الألبان'];if(names.includes('الجلوتين'))return['بسكويت مصنوع من دقيق الأرز','منتج شوفان معتمد خالٍ من الجلوتين','كراكرز من دقيق الذرة أو الحنطة السوداء','بسكويت من دقيق جوز الهند'];if(names.includes('البيض'))return['بديل البيض النباتي','بذور الكتان المطحونة مع الماء','مهروس الموز للخبز','صلصة خالية من المايونيز'];return['منتج بسيط المكونات وخالٍ من العناصر المذكورة','بديل منزلي بمكونات موثوقة','منتج يحمل ملصقاً واضحاً وخالياً من مسببات الحساسية','طعام طازج غير مصنّع من القائمة الآمنة']}
function hiddenWarning(matches){const names=matches.map(m=>m.group).join(' ');if(names.includes('الجلوتين'))return'المنتج قد يحتوي على دقيق القمح أو الشعير أو منكهات ومواد رابطة مشتقة من الجلوتين. تحققي من عبارة «خالٍ من الجلوتين» ومن تحذير التلوث المتبادل.';if(names.includes('الألبان'))return'قد تظهر مشتقات الحليب بأسماء مثل مصل الحليب، الكازين، الزبدة أو مسحوق الحليب. كل مشتقات الألبان تدخل ضمن هذه المجموعة.';if(names.includes('الصويا'))return'قد تكون الصويا مخفية تحت أسماء مثل ليسيثين الصويا E322 أو البروتين النباتي المتحلل.';return'قد توجد مصادر خفية أو آثار من هذه المكونات. افحصي عبارات «قد يحتوي على» و«مصنّع في منشأة تستخدم» على العبوة.'}
function imageReadingBlock(reading){if(!reading)return'';const labels=friendlyLabels(reading.labels);const visible=[labels.length?`تم التعرف بصرياً على: ${labels.join('، ')}`:'',reading.ocrText?`النص المقروء: ${reading.ocrText}`:''].filter(Boolean);return `<div class="image-reading"><strong>ما تمّت قراءته من الصورة</strong><p>${visible.length?visible.map(escapeHtml).join('<br>'):'الصورة غير واضحة بما يكفي لقراءة تفاصيل موثوقة. صوّري الملصق مباشرة بإضاءة جيدة أو اكتبي المكونات يدوياً.'}</p></div>`}
function renderUncertain(name,reading){$('result').innerHTML=`<section class="result-card uncertain"><div class="result-head"><span class="result-mark">!</span><div><h3>لا يمكن تأكيد الأمان</h3><p class="product-name">${escapeHtml(name)}</p></div></div>${imageReadingBlock(reading)}<h4>النتيجة</h4><p class="section-copy">لم نحصل على معلومات واضحة وكافية من الصورة. لذلك لن نعتبر المنتج آمناً.</p><h4>ما الذي يجب فعله؟</h4><div class="result-note">صوّري واجهة المنتج وقائمة المكونات بوضوح، أو اكتبي اسم المنتج والمكونات يدوياً ثم أعيدي الفحص.</div></section>`}
function renderResult(name,matches,reading){const safeName=escapeHtml(name);const readingBlock=imageReadingBlock(reading);if(matches.length){const detected=[...new Set(matches.flatMap(m=>m.ingredients))];const tags=detected.map(item=>`<li>${escapeHtml(item)}</li>`).join('');const alternatives=suggestions(matches).map(item=>`<li>• ${item}</li>`).join('');$('result').innerHTML=`<section class="result-card danger"><div class="result-head"><span class="result-mark">×</span><div><h3>ممنوع — لا تأكلي</h3><p class="product-name">${safeName}</p></div></div>${readingBlock}<h4>مكونات ممنوعة تم اكتشافها</h4><ul class="detected-tags">${tags}</ul><h4>تنبيه: مصادر خفية محتملة</h4><p class="section-copy">${escapeHtml(hiddenWarning(matches))}</p><h4>ملاحظات</h4><p class="section-copy">هذا المنتج ممنوع تماماً لأنه يحتوي على مكونات من المجموعات الممنوعة. تجنبيه كلياً حتى لو كانت الكمية قليلة، وتحققي دائماً من الملصق لأن التركيبات قد تتغير.</p><h4>بدائل آمنة مقترحة</h4><ul class="alternatives">${alternatives}</ul></section>`}else{$('result').innerHTML=`<section class="result-card safe"><div class="result-head"><span class="result-mark">✓</span><div><h3>لم نجد مكونات ممنوعة</h3><p class="product-name">${safeName}</p></div></div>${readingBlock}<h4>نتيجة الفحص</h4><p class="section-copy">لم نكتشف أياً من المجموعات الممنوعة في الاسم أو المكونات أو النص الواضح المقروء من الصورة.</p><h4>ملاحظات</h4><div class="result-note">يبدو مناسباً بحسب البيانات المتاحة. افحصي العبوة كاملة وتأكدي من التحذيرات ومخاطر التلوث المتبادل قبل تناوله.</div></section>`}}
$('foodForm').addEventListener('submit',async e=>{e.preventDefault();const ingredients=$('ingredientsInput').value.trim();if(!ingredients&&!uploadedFile){showMessage('اكتبي اسم الطعام أو المكونات، أو ارفعي صورة لإجراء الفحص.');return}let name=$('productName').value.trim()||ingredients.slice(0,80)||'المنتج المصوّر';const mode=uploadedFile?'image':'text';if(!imageAlreadyCounted&&usage[mode]<=0){showMessage('انتهى رصيد الفحص التجريبي لهذا اليوم. يعود الرصيد غداً.');return}$('checkButton').disabled=true;let reading=lastImageReading;if(uploadedFile&&!reading)reading=await readImage();else if(!uploadedFile)$('result').innerHTML='<p class="loading">جاري فحص المنتج والمكونات...</p>';if(reading&&!$('productName').value.trim()){const inferred=inferProductName(reading);if(inferred)name=inferred}if(!imageAlreadyCounted){usage[mode]--;saveUsage()}const imageData=reading?`${reading.ocrText} ${reading.labels.join(' ')}`:'';const matches=analyze(`${name} ${ingredients} ${imageData}`);if(matches.length)renderResult(name,matches,reading);else if(uploadedFile&&!hasReliableEvidence(name,ingredients,reading))renderUncertain(name,reading);else renderResult(name,matches,reading);$('checkButton').disabled=false});
