const GROUPS = `
1. الجلوتين والقمح: القمح، الشعير، الشوفان، الجاودار، السبيلت، الكاموت، الخبز، المعكرونة، البرغل، السميد، الفريكة، الكسكس، المفتول.
2. كل الألبان: حليب البقر والأغنام والماعز، الجبن، اللبنة، اللبن، الزبادي، الزبدة، القشدة، الآيس كريم، مصل الحليب والكازين.
3. الصويا: فول الصويا، التوفو، صلصة وحليب الصويا، ليسيثين الصويا E322.
4. البندورة المعقودة: معجون وصلصة الطماطم والبندورة، الكاتشاب وصلصة البيتزا الجاهزة.
5. كل البقوليات: الحمص، العدس، الفول، الفاصولياء، البازلاء، اللوبيا، الترمس والفول السوداني.
6. كل المكسرات: اللوز، الجوز، الكاجو، البندق، الفستق، الصنوبر، الماكاداميا والبقان ومشتقاتها.
7. السمسم: السمسم، الطحينة، الحلاوة وزيت السمسم.
8. البيض: كل أنواع البيض، المايونيز والكاسترد ومشتقاته.
9. فواكه ممنوعة: الليمون، الفراولة، التفاح، المشمش وقمر الدين، الكيوي والأناناس.
10. خضروات: الهليون.
11. مأكولات بحرية ممنوعة: الجمبري والروبيان، المحار، السلطعون، الاستاكوزا، سمك القد والبولوك، الحبار، أبو سيف والفرخ.
12. لحم الأرانب.
13. شراب القيقب أو المابل.
`;

function response(statusCode, body, origin = '') {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (origin) headers['access-control-allow-origin'] = origin;
  return { statusCode, headers, body: JSON.stringify(body) };
}

export async function handler(event) {
  const origin = event.headers?.origin || '';
  const allowed = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.ALLOWED_ORIGIN].filter(Boolean);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' }, body: '' };
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' }, origin);
  if (allowed.length && origin && !allowed.includes(origin)) return response(403, { error: 'Origin not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return response(503, { error: 'AI service is not configured' }, origin);

  try {
    const { imageBase64, mediaType, userText = '' } = JSON.parse(event.body || '{}');
    if (!imageBase64 || !/^image\/(jpeg|png|webp|gif)$/.test(mediaType || '')) return response(400, { error: 'Valid image required' }, origin);
    if (imageBase64.length > 8_000_000) return response(413, { error: 'Image is too large' }, origin);

    const prompt = `أنت اختصاصي دقيق لفحص الطعام. اقرأ الصورة بصرياً: اسم المنتج، نوعه، النص الظاهر، وقائمة المكونات إن وجدت. قارن كل شيء بالقائمة الممنوعة التالية:\n${GROUPS}\nمعلومات كتبها المستخدم إن وجدت: ${userText || 'لا يوجد'}\nقواعد إلزامية: ابدأ بتحديد هل الصورة تعرض طعاماً أو شراباً معبأً أصلاً. إذا كانت صورة شخص فاختر safe وkind=not_food واجعل productName="شخص (ليس طعام)" واترك detected فارغة. لأي حيوان أو مكان أو غرض غير غذائي آخر استخدم kind=not_food أيضاً. لا تستنتج القمح أو الحليب أو البيض أو أي مكون ممنوع من ألوان العبوة أو شكلها. لا تضع status=prohibited إلا عندما ترى اسم المكون أو تحذير الحساسية بوضوح، أو تتعرف بثقة عالية جداً على منتج معروف يحتوي عليه حتماً. عبوات المشروبات الغازية والعصائر ليست بسكويتاً ولا منتجات ألبان؛ تعرّف على العلامة والنوع الظاهرين أولاً. إذا لم تستطع قراءة دليل مباشر فاختر uncertain، ولا تختر مكونات محتملة أو متخيلة. اجعل evidence يذكر النص المرئي الذي يثبت كل detected. أرجع JSON فقط دون markdown بهذا الشكل:
{"status":"prohibited|safe|uncertain","kind":"food|not_food","productName":"اسم عربي واضح","subtitle":"وصف قصير","detected":[{"group":"اسم المجموعة","ingredient":"المكون المكتشف"}],"hiddenWarning":"شرح عربي محدد للمصادر الخفية","notes":"ملاحظات عربية عملية","alternatives":["بديل 1","بديل 2","بديل 3"],"evidence":"ملخص قصير لما قرأته فعلياً"}`;

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 1200,
        temperature: 0,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } }, { type: 'text', text: prompt }] }]
      })
    });
    if (!apiResponse.ok) return response(502, { error: 'AI analysis failed' }, origin);
    const payload = await apiResponse.json();
    const text = payload.content?.find(item => item.type === 'text')?.text || '';
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) return response(502, { error: 'Invalid AI response' }, origin);
    const result = JSON.parse(jsonText);
    return response(200, result, origin);
  } catch (error) {
    console.error('analyze error', error?.message || error);
    return response(500, { error: 'Unable to analyze image' }, origin);
  }
}
