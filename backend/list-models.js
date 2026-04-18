const apiKey = 'AIzaSyDOEu3IUeZLNn9YFJXSWaCsgiV_CbFBisE';
fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey)
  .then(async r => {
    const d = await r.json();
    console.log(d.models.map(m => m.name).join('\n'));
  })
  .catch(err => console.error('Error:', err));
