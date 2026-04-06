const prompt = 'Hello';
const apiKey = 'AIzaSyBEzvACCguGoLJqDXVCCTh7sdrIb1QFu0E';
const body = { contents: [{ parts: [{ text: prompt }] }] };

fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
  .then(async r => {
    console.log('Status:', r.status);
    console.log('Response:', await r.text());
  })
  .catch(err => console.error('Error:', err));
