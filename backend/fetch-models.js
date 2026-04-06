const apiKey = 'AIzaSyDEUuPYqX3-GMr5zlfIOrc6jOw9JjFpTSk';
fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey)
  .then(async r => {
    const d = await r.json();
    require('fs').writeFileSync('models.json', JSON.stringify(d, null, 2));
  })
  .catch(err => console.error(err));
