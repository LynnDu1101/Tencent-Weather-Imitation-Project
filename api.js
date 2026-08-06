// 和风天气 API 封装
// 文档：https://dev.qweather.com/

const QWEATHER_CONFIG = {
  HOST: 'https://mt6mth83er.re.qweatherapi.com',
  API_KEY: 'ddfc8f403e6043d790c6a06fe0d79097',
};

// 通用请求方法（使用请求标头认证）
async function request(path, params = {}) {
  const url = new URL(QWEATHER_CONFIG.HOST + path);
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });

  const response = await fetch(url, {
    headers: {
      'X-QW-Api-Key': QWEATHER_CONFIG.API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 1. 城市搜索 - 点击城市名时切换定位
// GET /geo/v2/city/lookup
async function searchCity(location, adm = '', range = 'cn') {
  return request('/geo/v2/city/lookup', { location, adm, range });
}

// 2. 热门城市 - 搜索框下拉菜单
// GET /geo/v2/city/top
async function getTopCities(range = 'cn', number = 10) {
  return request('/geo/v2/city/top', { range, number });
}

// 3. 城市实时天气（基于 Location ID）
// GET /v7/weather/now
async function getWeatherNow(location) {
  return request('/v7/weather/now', { location });
}

// 4. 城市每日天气预报（基于 Location ID）
// GET /v7/weather/{days}  days: 7d / 15d
async function getWeatherDaily(location, days = '7d') {
  return request(`/v7/weather/${days}`, { location });
}

// 5. 城市小时天气预报（基于 Location ID）
// GET /v7/weather/{hours}  hours: 24h / 72h
async function getWeatherHourly(location, hours = '24h') {
  return request(`/v7/weather/${hours}`, { location });
}

// 6. 实时天气（基于经纬度）
// GET /weather/v1/current/{latitude}/{longitude}
async function getCurrentWeather(latitude, longitude) {
  return request(`/weather/v1/current/${latitude}/${longitude}`);
}

// 7. 每日天气预报（基于经纬度）
// GET /weather/v1/daily/{latitude}/{longitude}
async function getDailyWeather(latitude, longitude) {
  return request(`/weather/v1/daily/${latitude}/${longitude}`);
}

// 8. 小时天气预报（基于经纬度）
// GET /weather/v1/hourly/{latitude}/{longitude}
async function getHourlyWeather(latitude, longitude) {
  return request(`/weather/v1/hourly/${latitude}/${longitude}`);
}

// 9. 实时天气预警（基于经纬度）
// GET /weatheralert/v1/current/{latitude}/{longitude}
async function getWeatherAlert(latitude, longitude) {
  return request(`/weatheralert/v1/current/${latitude}/${longitude}`);
}

// 10. 天气指数 / 生活指数（基于 Location ID）
// GET /v7/indices/{days}  days: 1d / 3d / 7d / 10d / 15d
// type=0 返回全部指数类型
async function getWeatherIndices(location, days = '1d', type = '0') {
  return request(`/v7/indices/${days}`, { location, type });
}

// 11. 实时空气质量（基于经纬度）
// GET /airquality/v1/current/{latitude}/{longitude}
async function getAirQuality(latitude, longitude) {
  return request(`/airquality/v1/current/${latitude}/${longitude}`);
}

// 12. 天气时光机 - 最近10天历史天气
// GET /v7/historical/weather
async function getHistoricalWeather(location, date) {
  return request('/v7/historical/weather', { location, date });
}
