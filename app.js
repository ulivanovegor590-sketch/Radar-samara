const state = {
  city: "Самара",
  lat: 53.1959,
  lon: 50.1002,
  forecast: null,
  days: 7
};

const $ = id => document.getElementById(id);

const weatherCodes = {
  0:["Ясно","☀️"],1:["Преимущественно ясно","🌤️"],2:["Переменная облачность","⛅"],
  3:["Пасмурно","☁️"],45:["Туман","🌫️"],48:["Изморозь","🌫️"],
  51:["Слабая морось","🌦️"],53:["Морось","🌦️"],55:["Сильная морось","🌧️"],
  61:["Небольшой дождь","🌦️"],63:["Дождь","🌧️"],65:["Сильный дождь","🌧️"],
  71:["Небольшой снег","🌨️"],73:["Снег","🌨️"],75:["Сильный снег","❄️"],
  80:["Ливень","🌦️"],81:["Ливень","🌧️"],82:["Сильный ливень","⛈️"],
  95:["Гроза","⛈️"],96:["Гроза с градом","⛈️"],99:["Сильная гроза","⛈️"]
};

function weather(code){ return weatherCodes[code] || ["Переменная погода","🌤️"]; }
function dayName(date){ return new Date(date+"T12:00:00").toLocaleDateString("ru-RU",{weekday:"short"}).replace(".",""); }
function dateShort(date){ return new Date(date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"}).replace(".",""); }
function timeShort(s){ return s ? new Date(s).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}) : "—"; }

async function geocode(city){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
  const r = await fetch(url); if(!r.ok) throw new Error("Ошибка поиска");
  const d = await r.json(); if(!d.results?.length) throw new Error("Город не найден");
  return d.results[0];
}

async function loadWeather(){
  $("currentCondition").textContent = "Загрузка...";
  $("currentTemp").textContent = "—°";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=16`;
  const r = await fetch(url); if(!r.ok) throw new Error("Не удалось получить прогноз");
  state.forecast = await r.json();
  renderCurrent();
  renderForecast();
  renderCalendar();
}

function windDirection(deg){
  const dirs=["С","СВ","В","ЮВ","Ю","ЮЗ","З","СЗ"];
  return dirs[Math.round(deg/45)%8];
}

function renderCurrent(){
  const c=state.forecast.current, d=state.forecast.daily;
  const [cond,icon]=weather(c.weather_code);
  $("currentIcon").textContent=icon;
  $("currentTemp").textContent=Math.round(c.temperature_2m)+"°";
  $("currentCondition").textContent=cond;
  $("feels").textContent=`Ощущается как ${Math.round(c.apparent_temperature)}°`;
  $("humidity").textContent=Math.round(c.relative_humidity_2m)+"%";
  $("wind").textContent=`${Math.round(c.wind_speed_10m)} км/ч · ${windDirection(c.wind_direction_10m)}`;
  $("pressure").textContent=Math.round(c.surface_pressure)+" гПа";
  $("uv").textContent=(d.uv_index_max[0] ?? 0).toFixed(1);
  $("sunrise").textContent=timeShort(d.sunrise[0]);
  $("sunset").textContent=timeShort(d.sunset[0]);
  $("updated").textContent="Обновлено: "+new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
}

function renderForecast(){
  const d=state.forecast.daily;
  $("forecast").innerHTML="";
  for(let i=0;i<state.days;i++){
    const [cond,icon]=weather(d.weather_code[i]);
    const el=document.createElement("div"); el.className="forecast-card";
    el.innerHTML=`<div class="day">${i===0?"Сегодня":dayName(d.time[i])}</div>
      <div class="date">${dateShort(d.time[i])}</div>
      <div class="icon">${icon}</div>
      <div class="temps">${Math.round(d.temperature_2m_max[i])}° <small>${Math.round(d.temperature_2m_min[i])}°</small></div>
      <div class="rain">💧 ${d.precipitation_probability_max[i] ?? 0}%</div>`;
    el.title=cond;
    $("forecast").appendChild(el);
  }
}

function renderCalendar(){
  const d=state.forecast.daily;
  const now=new Date();
  const year=now.getFullYear(), month=now.getMonth();
  const first=new Date(year,month,1);
  let start=(first.getDay()+6)%7;
  const total=new Date(year,month+1,0).getDate();
  const prevTotal=new Date(year,month,0).getDate();
  let html="";
  for(let i=0;i<start;i++){
    html+=`<div class="calendar-day muted-day"><div class="num">${prevTotal-start+i+1}</div></div>`;
  }
  for(let day=1;day<=total;day++){
    const idx=d.time.findIndex(x=>new Date(x+"T12:00:00").getDate()===day);
    const today=day===now.getDate();
    if(idx>=0){
      const [c,icon]=weather(d.weather_code[idx]);
      html+=`<div class="calendar-day ${today?"today":""}" title="${c}">
        <div class="num">${day}</div><div class="mini">${icon}</div>
        <div class="mini-temp">${Math.round(d.temperature_2m_max[idx])}° / ${Math.round(d.temperature_2m_min[idx])}°</div>
      </div>`;
    } else {
      html+=`<div class="calendar-day ${today?"today":""}"><div class="num">${day}</div><div class="mini">—</div><div class="mini-temp">нет данных</div></div>`;
    }
  }
  const cells=Math.ceil((start+total)/7)*7;
  for(let i=start+total;i<cells;i++) html+=`<div class="calendar-day muted-day"><div class="num">${i-start-total+1}</div></div>`;
  $("calendarGrid").innerHTML=html;
}

async function searchCity(){
  const q=$("cityInput").value.trim(); if(!q)return;
  try{
    const place=await geocode(q);
    state.city=place.name; state.lat=place.latitude; state.lon=place.longitude;
    $("locationName").textContent=place.name;
    $("locationMeta").textContent=[place.country,place.admin1].filter(Boolean).join(" · ");
    await loadWeather();
  }catch(e){ alert(e.message); }
}

$("searchBtn").addEventListener("click",searchCity);
$("cityInput").addEventListener("keydown",e=>{if(e.key==="Enter")searchCity()});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); state.days=+b.dataset.days; renderForecast();
}));
$("themeBtn").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  $("themeBtn").textContent=document.body.classList.contains("dark")?"☀":"☾";
  localStorage.setItem("skycast-dark",document.body.classList.contains("dark"));
});
if(localStorage.getItem("skycast-dark")==="true"){document.body.classList.add("dark");$("themeBtn").textContent="☀";}

loadWeather().catch(e=>{
  $("currentCondition").textContent="Не удалось загрузить погоду";
  console.error(e);
});
