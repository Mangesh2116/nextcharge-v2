

const run = async () => {
  const lat = 18.5204;
  const lng = 73.8567;
  const rad = 25000; // 25km
  const deg = rad / 111000;
  const s = lat - deg;
  const w = lng - deg;
  const n = lat + deg;
  const e = lng + deg;

  const query = `[out:json];node["amenity"="charging_station"](${s},${w},${n},${e});out;`;
  console.log('Query:', query);

  const url = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    console.log('Status:', res.status);
    if (!res.ok) {
      console.log('Error body:', await res.text());
      return;
    }
    const data = await res.json();
    console.log('Elements found:', data.elements ? data.elements.length : 0);
    if (data.elements && data.elements.length > 0) {
      console.log('First element sample:', JSON.stringify(data.elements[0], null, 2));
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
};

run();
