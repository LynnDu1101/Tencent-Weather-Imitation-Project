(function () {
  var lsWeather = document.querySelector('.ls-weather');
  var btnLeft = document.querySelector('.icon-a-danjiantoudaiquanzuo');
  var btnRight = document.querySelector('.icon-a-danjiantoudaiquanyou');

  if (!lsWeather || !btnLeft || !btnRight) return;

  var items = lsWeather.querySelectorAll('.item');
  var total = items.length;        // 26
  var visible = 12;                // 视窗显示个数
  var maxIndex = total - visible;  // 14
  var step = 11;                   // 每次移动个数
  var itemWidth = 40;
  var gap = 60;
  var unit = itemWidth + gap;      // 100px，单个 li 占位

  var currentIndex = 0;

  function update() {
    lsWeather.style.transform = 'translateX(' + (-currentIndex * unit) + 'px)';
  }

  // 右箭头：向后翻，内容向左滑动
  btnRight.addEventListener('click', function (e) {
    e.preventDefault();
    currentIndex = Math.min(currentIndex + step, maxIndex);
    update();
  });

  // 左箭头：向前翻，内容向右滑动
  btnLeft.addEventListener('click', function (e) {
    e.preventDefault();
    currentIndex = Math.max(currentIndex - step, 0);
    update();
  });
})();

// living 翻页
(function () {
  var wrapper = document.querySelector('.container2 .living .page-wrapper');
  var btnLeft = document.querySelector('.lvheaderright .icon-a-danjiantoudaiquanzuo');
  var btnRight = document.querySelector('.lvheaderright .icon-a-danjiantoudaiquanyou');

  if (!wrapper || !btnLeft || !btnRight) return;

  var pages = wrapper.querySelectorAll('.page');
  var index = 0;
  var pageWidth = 400;

  function update() {
    wrapper.style.transform = 'translateX(' + (-index * pageWidth) + 'px)';
  }

  // 右箭头：下一页，向左滑动
  btnRight.addEventListener('click', function (e) {
    e.preventDefault();
    if (index >= pages.length - 1) return;
    index++;
    update();
  });

  // 左箭头：上一页，向右滑动
  btnLeft.addEventListener('click', function (e) {
    e.preventDefault();
    if (index <= 0) return;
    index--;
    update();
  });
})();

// 城市搜索 / 定位 / 历史记录 / 热门城市
(function () {
  var searchInput = document.querySelector('.search-input');
  var searchDropdown = document.querySelector('.search-dropdown');
  var searchWrap = document.querySelector('.search');
  var sdNormal = document.querySelector('.sd-normal');
  var sdSearch = document.querySelector('.sd-search');
  var txtCurLocation = document.querySelector('.txt-cur-location');
  var sdCityName = document.querySelector('.sd-city-name');
  var historySection = document.querySelector('.sd-history-section');
  var historyGrid = document.querySelector('.sd-history-grid');
  var hotGrid = document.querySelector('.sd-hot-grid');
  var clearBtn = document.querySelector('.sd-clear');
  var sdCurrent = document.querySelector('.sd-current');

  if (!searchInput || !searchDropdown || !searchWrap) return;

  var HISTORY_KEY = 'tencent_weather_history_v2';
  var CURRENT_KEY = 'tencent_weather_current_v3';
  var FOLLOWED_KEY = 'tencent_weather_followed_v1';
  var DEFAULT_KEY = 'tencent_weather_default_v1';
  var searchTimer = null;
  var currentSelectedCity = null;
  var popupTimer = null;
  var followPopup = document.querySelector('.follow-popup');
  var followList = document.querySelector('.follow-list');
  var attentionBtn = document.querySelector('.attention');
  var showWrap = document.querySelector('.show');

  // 天气文字 → 图标文件名映射
  var weatherIconMap = {
    '晴': '00晴',
    '多云': '01多云',
    '阴': '02阴',
    '阵雨': '03阵雨',
    '雷阵雨': '04雷阵雨',
    '小雨': '07小雨',
    '中雨': '08中雨',
    '大雨': '09大雨'
  };

  // ---------- 工具函数 ----------
  // 判断是否为市级结果（非区/县）
  // 注意：和风 API 的 type 字段不可靠（区级也标记为 city），
  // 必须用 adm2 判断：市的 adm2 等于自身名或自身名+市，区级的 adm2 是上级市名
  function isCity(loc) {
    return loc.adm2 === loc.name || loc.adm2 === loc.name + '市';
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (e) { }
  }

  function getCurrentCity() {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveCurrentCity(city) {
    try {
      localStorage.setItem(CURRENT_KEY, JSON.stringify(city));
    } catch (e) { }
  }

  function getDefaultCity() {
    try {
      return JSON.parse(localStorage.getItem(DEFAULT_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveDefaultCity(city) {
    try {
      localStorage.setItem(DEFAULT_KEY, JSON.stringify({
        id: city.id,
        name: city.name,
        adm1: city.adm1 || '',
        adm2: city.adm2 || ''
      }));
    } catch (e) { }
  }

  function removeDefaultCity() {
    try {
      localStorage.removeItem(DEFAULT_KEY);
    } catch (e) { }
  }

  // 如果有默认城市，覆盖 txt-cur-location（不影响 sd-city-name 当前定位）
  function applyDefaultCity() {
    var defaultCity = getDefaultCity();
    if (defaultCity) {
      updateTxtLocation(defaultCity);
      currentSelectedCity = defaultCity;
    }
  }

  // 恢复 txt-cur-location 为定位城市
  function restoreGeolocationCity() {
    var geoCity = getCurrentCity();
    if (geoCity) {
      updateTxtLocation(geoCity);
      currentSelectedCity = geoCity;
    }
  }

  // 更新[添加关注]按钮：如果当前城市已关注，显示[已关注]
  function updateAttentionBtn() {
    if (!attentionBtn || !currentSelectedCity) return;
    var list = getFollowed();
    var isFollowed = list.some(function (c) { return c.id === currentSelectedCity.id; });
    if (isFollowed) {
      attentionBtn.textContent = '[已关注]';
    } else {
      attentionBtn.textContent = '[添加关注]';
    }
  }

  // 为定位显示生成带"市"的名称（仅用于顶部定位，不影响热门城市/历史）
  function withShiSuffix(name) {
    if (!name) return '';
    var last = name.charAt(name.length - 1);
    var suffixes = ['市', '区', '县', '旗'];
    if (suffixes.indexOf(last) === -1) return name + '市';
    return name;
  }

  // 更新顶部定位显示（仅由 geolocation 调用，同时更新 txt-cur-location 和 sd-city-name）
  function updateLocationDisplay(city) {
    var showAdm = city.adm1 && city.adm1 !== city.displayName && city.adm1 !== city.name;
    if (txtCurLocation) {
      // txt-cur-location 去掉省、市后缀（陕西省 西安市 → 陕西 西安）
      var adm = showAdm ? city.adm1.replace(/省$/, '').replace(/市$/, '') : '';
      var cityName = city.displayName.replace(/市$/, '');
      txtCurLocation.textContent = (adm ? adm + ' ' : '') + cityName;
    }
    if (sdCityName) {
      sdCityName.textContent = city.displayName;
    }
  }

  // 仅更新 txt-cur-location（点击城市时调用，不影响"当前定位" sd-city-name）
  function updateTxtLocation(loc) {
    if (!txtCurLocation) return;
    var displayName = withShiSuffix(loc.name);
    var showAdm = loc.adm1 && loc.adm1 !== displayName && loc.adm1 !== loc.name;
    var adm = showAdm ? loc.adm1.replace(/省$/, '').replace(/市$/, '') : '';
    var cityName = displayName.replace(/市$/, '');
    txtCurLocation.textContent = (adm ? adm + ' ' : '') + cityName;
  }

  // 加入历史记录（去重，最多4个，最近点击的在最前）
  function addHistory(loc) {
    var list = getHistory();
    list = list.filter(function (c) { return c.id !== loc.id; });
    list.unshift({
      id: loc.id,
      name: loc.name,
      adm1: loc.adm1 || '',
      adm2: loc.adm2 || ''
    });
    if (list.length > 4) list = list.slice(0, 4);
    saveHistory(list);
    renderHistory();
  }

  // 渲染历史记录（只显示城市名，不加"市"）
  function renderHistory() {
    if (!historyGrid) return;
    var list = getHistory();
    historyGrid.innerHTML = '';
    if (list.length === 0) {
      // 没有历史：只隐藏城市名，标题和清除按钮保持显示
      historyGrid.style.visibility = 'hidden';
      return;
    }
    historyGrid.style.visibility = 'visible';
    list.forEach(function (city) {
      var div = document.createElement('div');
      div.className = 'sd-city';
      div.textContent = city.name;
      div.addEventListener('click', function () {
        selectCity(city);
      });
      historyGrid.appendChild(div);
    });
  }

  // 选择城市：加入历史记录，更新 txt-cur-location（但不改变"当前定位" sd-city-name）
  function selectCity(loc) {
    addHistory(loc);
    updateTxtLocation(loc);
    currentSelectedCity = loc;
    updateAttentionBtn();
    resetSearch();
    closeDropdown();
  }

  // 重置搜索框和下拉框为初始状态
  function resetSearch() {
    searchInput.value = '';
    searchDropdown.classList.remove('searching');
    if (sdSearch) sdSearch.innerHTML = '';
    if (sdSearch) sdSearch.style.display = 'none';
    if (sdNormal) sdNormal.style.display = 'block';
  }

  function closeDropdown() {
    searchDropdown.classList.remove('show');
  }

  function showSearching() {
    searchDropdown.classList.add('show', 'searching');
    if (sdNormal) sdNormal.style.display = 'none';
    if (sdSearch) sdSearch.style.display = 'block';
  }

  // 渲染搜索结果（只显示市，不显示区）
  function renderSearchResults(locations) {
    if (!sdSearch) return;
    sdSearch.innerHTML = '';
    var cities = (locations || []).filter(isCity);
    if (cities.length === 0) {
      var noResult = document.createElement('div');
      noResult.className = 'sd-no-result';
      noResult.textContent = '抱歉，未找到相关位置';
      sdSearch.appendChild(noResult);
      return;
    }
    cities.forEach(function (loc) {
      var item = document.createElement('div');
      item.className = 'sd-search-item';

      var name = document.createElement('span');
      name.className = 'ssi-name';
      name.textContent = loc.name;
      item.appendChild(name);

      var admParts = [loc.adm1, loc.adm2].filter(Boolean);
      if (admParts.length > 0) {
        var adm = document.createElement('span');
        adm.className = 'ssi-adm';
        adm.textContent = admParts.join(' ');
        item.appendChild(adm);
      }

      item.addEventListener('click', function () {
        selectCity(loc);
      });
      sdSearch.appendChild(item);
    });
  }

  // 搜索输入处理（防抖 300ms）
  function handleSearch() {
    var query = searchInput.value.trim();
    if (!query) {
      searchDropdown.classList.remove('searching');
      if (sdSearch) sdSearch.innerHTML = '';
      if (sdSearch) sdSearch.style.display = 'none';
      if (sdNormal) sdNormal.style.display = 'block';
      return;
    }
    showSearching();
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchCity(query).then(function (res) {
        renderSearchResults(res && res.location ? res.location : []);
      }).catch(function () {
        renderSearchResults([]);
      });
    }, 300);
  }

  // ---------- 热门城市（只显示市，不显示区） ----------
  // 热门城市：和风 top 接口最多返回 20 条且大部分是区级，
  // 无法满足 7 行 × 4 列 = 28 个市级城市的需求，故使用固定热门城市列表
  var HOT_CITIES = [
    { id: '101010100', name: '北京', adm1: '北京市', adm2: '北京' },
    { id: '101020100', name: '上海', adm1: '上海市', adm2: '上海' },
    { id: '101280101', name: '广州', adm1: '广东省', adm2: '广州' },
    { id: '101280601', name: '深圳', adm1: '广东省', adm2: '深圳' },
    { id: '101270101', name: '成都', adm1: '四川省', adm2: '成都' },
    { id: '101040100', name: '重庆', adm1: '重庆市', adm2: '重庆' },
    { id: '101210101', name: '杭州', adm1: '浙江省', adm2: '杭州' },
    { id: '101190101', name: '南京', adm1: '江苏省', adm2: '南京' },
    { id: '101200101', name: '武汉', adm1: '湖北省', adm2: '武汉' },
    { id: '101110101', name: '西安', adm1: '陕西省', adm2: '西安' },
    { id: '101030100', name: '天津', adm1: '天津市', adm2: '天津' },
    { id: '101190401', name: '苏州', adm1: '江苏省', adm2: '苏州' },
    { id: '101250101', name: '长沙', adm1: '湖南省', adm2: '长沙' },
    { id: '101180101', name: '郑州', adm1: '河南省', adm2: '郑州' },
    { id: '101281601', name: '东莞', adm1: '广东省', adm2: '东莞' },
    { id: '101120201', name: '青岛', adm1: '山东省', adm2: '青岛' },
    { id: '101070101', name: '沈阳', adm1: '辽宁省', adm2: '沈阳' },
    { id: '101220101', name: '合肥', adm1: '安徽省', adm2: '合肥' },
    { id: '101280800', name: '佛山', adm1: '广东省', adm2: '佛山' },
    { id: '101210401', name: '宁波', adm1: '浙江省', adm2: '宁波' },
    { id: '101290101', name: '昆明', adm1: '云南省', adm2: '昆明' },
    { id: '101230201', name: '厦门', adm1: '福建省', adm2: '厦门' },
    { id: '101230101', name: '福州', adm1: '福建省', adm2: '福州' },
    { id: '101190301', name: '无锡', adm1: '江苏省', adm2: '无锡' },
    { id: '101120101', name: '济南', adm1: '山东省', adm2: '济南' },
    { id: '101070201', name: '大连', adm1: '辽宁省', adm2: '大连' },
    { id: '101050101', name: '哈尔滨', adm1: '黑龙江省', adm2: '哈尔滨' },
    { id: '101240101', name: '南昌', adm1: '江西省', adm2: '南昌' }
  ];

  function loadHotCities() {
    if (!hotGrid) return;
    renderHotCities(HOT_CITIES);
  }

  function renderHotCities(cities) {
    if (!hotGrid) return;
    hotGrid.innerHTML = '';
    cities.forEach(function (loc) {
      var div = document.createElement('div');
      div.className = 'sd-city';
      div.textContent = loc.name; // 不加"市"
      div.addEventListener('click', function () {
        selectCity(loc);
      });
      hotGrid.appendChild(div);
    });
  }

  // ---------- 自动定位（geolocation） ----------
  function autoLocate() {
    var saved = getCurrentCity();
    // 只有保存的城市是市级（adm2 === name）才直接使用，否则重新定位
    if (saved && saved.adm2 === saved.name) {
      updateLocationDisplay(saved);
      currentSelectedCity = saved;
      renderHistory();
      applyDefaultCity();
      updateAttentionBtn();
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        searchCity(lon + ',' + lat).then(function (res) {
          if (res && res.location && res.location.length > 0) {
            // 优先取市级结果
            var cities = res.location.filter(isCity);
            if (cities.length > 0) {
              setCurrentLocation(cities[0]);
            } else {
              // 没有市级结果：取第一个区级结果的上级市名（adm2）
              var first = res.location[0];
              if (first && first.adm2) {
                setCurrentLocation({
                  id: first.id,
                  name: first.adm2,
                  adm1: first.adm1 || '',
                  adm2: first.adm2
                });
              } else {
                loadDefaultCity();
              }
            }
          } else {
            loadDefaultCity();
          }
        }).catch(function () {
          loadDefaultCity();
        });
      }, function () {
        loadDefaultCity();
      }, { timeout: 5000, enableHighAccuracy: false });
    } else {
      loadDefaultCity();
    }
  }

  // 设置当前定位（仅由 geolocation 调用，与点击行为无关）
  function setCurrentLocation(loc) {
    var city = {
      id: loc.id,
      name: loc.name,
      adm1: loc.adm1 || '',
      adm2: loc.adm2 || '',
      displayName: withShiSuffix(loc.name)
    };
    saveCurrentCity(city);
    updateLocationDisplay(city);
    currentSelectedCity = loc;
    renderHistory();
    applyDefaultCity();
    updateAttentionBtn();
  }

  function loadDefaultCity() {
    setCurrentLocation({
      id: '101110101',
      name: '西安',
      adm1: '陕西省',
      adm2: '西安'
    });
  }

  // ---------- 事件绑定 ----------
  searchInput.addEventListener('focus', function () {
    searchDropdown.classList.add('show');
  });

  searchInput.addEventListener('click', function (e) {
    e.stopPropagation();
    searchDropdown.classList.add('show');
  });

  searchInput.addEventListener('input', handleSearch);

  // 回车选择第一个市级结果
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var query = searchInput.value.trim();
      if (!query) return;
      if (searchTimer) clearTimeout(searchTimer);
      searchCity(query).then(function (res) {
        var cities = res && res.location ? res.location.filter(isCity) : [];
        if (cities.length > 0) {
          selectCity(cities[0]);
        } else {
          showSearching();
          renderSearchResults([]);
        }
      }).catch(function () {
        showSearching();
        renderSearchResults([]);
      });
    }
  });

  searchDropdown.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  document.addEventListener('click', function (e) {
    if (!searchWrap.contains(e.target)) {
      closeDropdown();
      resetSearch();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      saveHistory([]);
      renderHistory();
    });
  }

  if (sdCurrent) {
    sdCurrent.addEventListener('click', function (e) {
      e.stopPropagation();
      closeDropdown();
      resetSearch();
    });
  }

  // ---------- 关注城市 ----------
  function getFollowed() {
    try {
      return JSON.parse(localStorage.getItem(FOLLOWED_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveFollowed(list) {
    try {
      localStorage.setItem(FOLLOWED_KEY, JSON.stringify(list));
    } catch (e) { }
  }

  function addFollowedCity(loc) {
    if (!loc || !loc.id) return;
    var list = getFollowed();
    if (list.length >= 5) {
      showLimitPopup();
      return;
    }
    if (list.some(function (c) { return c.id === loc.id; })) return;
    list.push({
      id: loc.id,
      name: loc.name,
      adm1: loc.adm1 || '',
      adm2: loc.adm2 || ''
    });
    saveFollowed(list);
    renderFollowedPopup();
    updateAttentionBtn();
  }

  var limitPopup = document.querySelector('.follow-limit-popup');
  var limitTimer = null;
  function showLimitPopup() {
    if (!limitPopup) return;
    limitPopup.style.display = 'block';
    if (limitTimer) clearTimeout(limitTimer);
    limitTimer = setTimeout(function () {
      limitPopup.style.display = 'none';
    }, 2000);
  }

  function removeFollowedCity(id) {
    var list = getFollowed();
    list = list.filter(function (c) { return c.id !== id; });
    saveFollowed(list);
    // 如果删除的是默认城市，同时取消默认（不立即改变 txt-cur-location，刷新后恢复定位）
    var defaultCity = getDefaultCity();
    if (defaultCity && defaultCity.id === id) {
      removeDefaultCity();
    }
    renderFollowedPopup();
    updateAttentionBtn();
  }

  function renderFollowedPopup() {
    if (!followList) return;
    var list = getFollowed();
    var defaultCity = getDefaultCity();
    followList.innerHTML = '';

    list.forEach(function (city) {
      var row = document.createElement('div');
      row.className = 'follow-row';
      if (defaultCity && defaultCity.id === city.id) {
        row.classList.add('is-default');
      }

      var nameSpan = document.createElement('span');
      nameSpan.className = 'follow-city';
      nameSpan.textContent = city.name;

      // 设为默认 / 取消默认 按钮
      var defaultBtn = document.createElement('span');
      defaultBtn.className = 'follow-default-btn';
      defaultBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isDefault = row.classList.contains('is-default');
        if (isDefault) {
          // 取消默认：不立即改变 txt-cur-location，刷新后才恢复定位城市
          row.classList.remove('is-default');
          removeDefaultCity();
        } else {
          // 设为默认：先清除其他行的默认状态
          document.querySelectorAll('.follow-row.is-default').forEach(function (r) {
            r.classList.remove('is-default');
          });
          row.classList.add('is-default');
          saveDefaultCity(city);
          // 不立即改变 txt-cur-location，刷新后才显示默认城市
        }
      });
      nameSpan.appendChild(defaultBtn);
      row.appendChild(nameSpan);

      var weatherSpan = document.createElement('span');
      weatherSpan.className = 'follow-weather';
      weatherSpan.textContent = '加载中';
      row.appendChild(weatherSpan);

      var tempSpan = document.createElement('span');
      tempSpan.className = 'follow-temp';
      row.appendChild(tempSpan);

      var trash = document.createElement('img');
      trash.className = 'follow-trash';
      trash.src = './img/垃圾桶.png';
      trash.alt = '删除';
      trash.addEventListener('click', function () {
        removeFollowedCity(city.id);
      });
      row.appendChild(trash);

      // 点击城市行（非垃圾桶/默认按钮）切换 txt-cur-location
      row.addEventListener('click', function (e) {
        if (!e.target.classList.contains('follow-trash') && !e.target.classList.contains('follow-default-btn')) {
          selectCity(city);
        }
      });

      followList.appendChild(row);

      // 调 API 获取当天天气
      if (typeof getWeatherDaily === 'function') {
        getWeatherDaily(city.id, '7d').then(function (res) {
          if (res && res.daily && res.daily.length > 0) {
            var today = res.daily[0];
            var textDay = today.textDay || '';
            var tempMax = today.tempMax || '';
            var tempMin = today.tempMin || '';

            // 取"转"前面的天气作为图标
            var iconText = textDay.split('转')[0];
            var iconFile = weatherIconMap[iconText] || '01多云';

            weatherSpan.innerHTML = '<img src="./img/weatherday/' + iconFile + '.png" alt="' + iconText + '" class="follow-weather-icon">' + textDay;
            tempSpan.textContent = tempMin + '°/' + tempMax + '°';
          }
        }).catch(function () {
          weatherSpan.textContent = '-';
        });
      }
    });
  }

  // hover 显示/隐藏关注弹出框（300ms 延时避免移动鼠标时闪烁）
  if (showWrap && followPopup) {
    showWrap.addEventListener('mouseenter', function () {
      clearTimeout(popupTimer);
      followPopup.style.display = 'block';
    });
    showWrap.addEventListener('mouseleave', function () {
      popupTimer = setTimeout(function () {
        followPopup.style.display = 'none';
      }, 300);
    });
  }

  // 点击"[添加关注]"添加当前城市
  if (attentionBtn) {
    attentionBtn.addEventListener('click', function () {
      if (currentSelectedCity) {
        addFollowedCity(currentSelectedCity);
      }
    });
  }

  // ---------- 初始化 ----------
  autoLocate();
  loadHotCities();
  renderFollowedPopup();
})();

// 逐小时预报：调用和风 API 实时更新 .containerbody 内容（已合并到下方 IIFE，此处禁用）
/*
(function () {
  var lsWeather = document.querySelector('.containerbody .ls-weather');
  if (!lsWeather) return;
  var items = lsWeather.querySelectorAll('.item');
  if (!items || items.length === 0) return;

  var DEFAULT_CITY_ID = '101110101'; // 西安
  var DEFAULT_KEY = 'tencent_weather_default_v1';
  var CURRENT_KEY = 'tencent_weather_current_v3';

  // 天气文字 → 图标文件名映射
  var weatherIconMap = {
    '晴': '00晴',
    '多云': '01多云',
    '阴': '02阴',
    '阵雨': '03阵雨',
    '雷阵雨': '04雷阵雨',
    '小雨': '07小雨',
    '中雨': '08中雨',
    '大雨': '09大雨'
  };

  // 夜间雷阵雨使用 "04打雷"，白天用 "04雷阵雨"
  function getIconFile(text, isDaytime) {
    if (!isDaytime && text === '雷阵雨') return '04打雷';
    return weatherIconMap[text] || '01多云';
  }

  // 解析 fxTime: "2026-08-05T22:00+08:00" → Date（按字符串中的年月日时分构造）
  function parseFxTime(fxTime) {
    var m = String(fxTime).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return new Date(fxTime);
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  }

  // 解析日出日落: fxDate "2026-08-05" + timeStr "05:58" → Date
  function parseSunTime(fxDate, timeStr) {
    var dp = fxDate.split('-');
    var tp = timeStr.split(':');
    return new Date(+dp[0], +dp[1] - 1, +dp[2], +tp[0], +tp[1]);
  }

  // 读取当前城市 ID（优先默认城市，其次定位城市）
  function getCityId() {
    try {
      var def = JSON.parse(localStorage.getItem(DEFAULT_KEY) || 'null');
      if (def && def.id) return def.id;
    } catch (e) { }
    try {
      var cur = JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null');
      if (cur && cur.id) return cur.id;
    } catch (e) { }
    return null;
  }

  // 判断某时刻是否为白天（日出后到日落前）
  function isDaytime(time, sunEvents) {
    var lastSunrise = null, lastSunset = null;
    for (var i = 0; i < sunEvents.length; i++) {
      if (sunEvents[i].time <= time) {
        if (sunEvents[i].type === 'sunrise') lastSunrise = sunEvents[i].time;
        else lastSunset = sunEvents[i].time;
      }
    }
    if (lastSunrise && lastSunset) return lastSunrise > lastSunset;
    if (lastSunrise) return true;
    if (lastSunset) return false;
    // 无前序事件：看下一个事件是日落→当前白天，日出→当前夜晚
    for (var j = 0; j < sunEvents.length; j++) {
      if (sunEvents[j].time > time) return sunEvents[j].type === 'sunset';
    }
    return true;
  }

  function updateForecast(cityId) {
    if (!cityId) return;
    if (typeof getWeatherHourly !== 'function' || typeof getWeatherDaily !== 'function') return;

    Promise.all([
      getWeatherHourly(cityId, '24h'),
      getWeatherDaily(cityId, '7d'),
      (typeof getWeatherNow === 'function') ? getWeatherNow(cityId) : Promise.resolve(null)
    ]).then(function (results) {
      var hourlyRes = results[0];
      var dailyRes = results[1];
      var nowRes = results[2];

      if (!hourlyRes || !hourlyRes.hourly || hourlyRes.hourly.length === 0) return;

      var hourlyData = hourlyRes.hourly;
      var dailyData = (dailyRes && dailyRes.daily) ? dailyRes.daily : [];

      // 收集所有日出日落事件并按时间排序
      var sunEvents = [];
      dailyData.forEach(function (d) {
        if (d.fxDate && d.sunrise) {
          sunEvents.push({ type: 'sunrise', time: parseSunTime(d.fxDate, d.sunrise), timeStr: d.sunrise });
        }
        if (d.fxDate && d.sunset) {
          sunEvents.push({ type: 'sunset', time: parseSunTime(d.fxDate, d.sunset), timeStr: d.sunset });
        }
      });
      sunEvents.sort(function (a, b) { return a.time - b.time; });

      // 当前整点
      var now = new Date();
      var currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);

      // 构建小时条目列表
      var entries = [];
      var firstFxTime = parseFxTime(hourlyData[0].fxTime);
      var firstHour = new Date(firstFxTime.getFullYear(), firstFxTime.getMonth(), firstFxTime.getDate(), firstFxTime.getHours(), 0, 0);

      if (firstHour.getTime() === currentHour.getTime()) {
        // API 已包含当前整点
        hourlyData.forEach(function (h) {
          entries.push({
            type: 'hour',
            time: parseFxTime(h.fxTime),
            temp: h.temp,
            text: (h.text || '').split('转')[0]
          });
        });
      } else {
        // API 从下一整点开始，需用实时天气补充当前整点
        if (nowRes && nowRes.now) {
          entries.push({
            type: 'hour',
            time: currentHour,
            temp: nowRes.now.temp,
            text: (nowRes.now.text || '').split('转')[0]
          });
        }
        hourlyData.forEach(function (h) {
          entries.push({
            type: 'hour',
            time: parseFxTime(h.fxTime),
            temp: h.temp,
            text: (h.text || '').split('转')[0]
          });
        });
      }

      // 截取 24 条小时数据
      entries = entries.slice(0, 24);

      // 插入窗口范围内的日出日落事件
      var windowStart = entries.length > 0 ? entries[0].time : currentHour;
      var windowEnd = entries.length > 0 ? entries[entries.length - 1].time : currentHour;
      var windowEndPlus1H = new Date(windowEnd.getTime() + 3600000);

      sunEvents.forEach(function (evt) {
        if (evt.time >= windowStart && evt.time < windowEndPlus1H) {
          entries.push(evt);
        }
      });

      // 按时间升序合并排序
      entries.sort(function (a, b) { return a.time - b.time; });

      // 截取 26 条（与 HTML 中 li 数量一致）
      entries = entries.slice(0, 26);

      // "今天"零点，用于判断 00:00 是否属于"明天"
      var todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

      // 更新 DOM 元素内容
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var timeP = item.querySelector('.text-time');
        var iconImg = item.querySelector('.icon');
        var degreeP = item.querySelector('.txt-degree');
        var entry = entries[i];

        if (!entry) {
          // 无数据：清空内容
          if (timeP) timeP.textContent = '';
          if (iconImg) { iconImg.removeAttribute('src'); iconImg.alt = ''; iconImg.title = ''; }
          if (degreeP) degreeP.textContent = '';
          continue;
        }

        if (entry.type === 'sunrise') {
          if (timeP) timeP.textContent = entry.timeStr;
          if (iconImg) { iconImg.src = './img/rise.png'; iconImg.alt = '日出'; iconImg.title = '日出'; }
          if (degreeP) degreeP.textContent = '日出';
        } else if (entry.type === 'sunset') {
          if (timeP) timeP.textContent = entry.timeStr;
          if (iconImg) { iconImg.src = './img/set.png'; iconImg.alt = '日落'; iconImg.title = '日落'; }
          if (degreeP) degreeP.textContent = '日落';
        } else {
          // 整点小时
          var hour = entry.time.getHours();
          var entryDate = new Date(entry.time.getFullYear(), entry.time.getMonth(), entry.time.getDate(), 0, 0, 0);
          var isNextDay = entryDate > todayMidnight;

          var timeLabel;
          if (hour === 0 && isNextDay) {
            timeLabel = '明天';
          } else {
            timeLabel = (hour < 10 ? '0' + hour : '' + hour) + ':00';
          }
          if (timeP) timeP.textContent = timeLabel;

          // 判断白天/晚上，选择对应图片文件夹
          var daytime = isDaytime(entry.time, sunEvents);
          var folder = daytime ? './img/weatherday/' : './img/weathernight/';
          var iconFile = getIconFile(entry.text, daytime);
          if (iconImg) {
            iconImg.src = folder + iconFile + '.png';
            iconImg.alt = entry.text;
            iconImg.title = entry.text;
          }
          if (degreeP) degreeP.textContent = entry.temp + '°';
        }
      }
    }).catch(function (err) {
      console.error('逐小时预报获取失败:', err);
    });
  }

  // 定时检查：城市变化或跨整点时重新拉取
  var lastCityId = null;
  var lastHour = -1;

  function tick() {
    var cityId = getCityId();
    if (!cityId) return; // geolocation 尚未完成，等待下一轮
    var currentHour = new Date().getHours();
    if (cityId !== lastCityId || currentHour !== lastHour) {
      lastCityId = cityId;
      lastHour = currentHour;
      updateForecast(cityId);
    }
  }

  tick();
  setInterval(tick, 60000); // 每分钟检查一次
})();
*/

// ==================== 逐小时预报：调用API填充数据 ====================
// 仅修改 .ls-weather 下 li 的元素内容（text-time / icon / txt-degree）
// 不改动任何 HTML 结构、CSS 样式或已有 JS 逻辑
(function () {
  var DEFAULT_KEY = 'tencent_weather_default_v1';
  var CURRENT_KEY = 'tencent_weather_current_v3';
  var HISTORY_KEY = 'tencent_weather_history_v2';

  // 天气文字 → 图标文件名映射
  var weatherIconMap = {
    '晴': '00晴', '多云': '01多云', '阴': '02阴',
    '阵雨': '03阵雨', '雷阵雨': '04雷阵雨',
    '小雨': '07小雨', '中雨': '08中雨', '大雨': '09大雨'
  };
  // 夜间文件夹中"雷阵雨"对应文件名不同
  var nightIconOverride = { '雷阵雨': '04打雷' };

  var lsWeather = document.querySelector('.ls-weather');
  if (!lsWeather) return;
  var items = lsWeather.querySelectorAll('.item');
  if (!items.length) return;
  var txtCurLocation = document.querySelector('.txt-cur-location');

  // ---------- 工具函数 ----------
  function pad2(n) { return String(n).padStart(2, '0'); }

  function toDateStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // 根据 txt-cur-location 文本匹配 localStorage 中的城市 ID
  // 匹配顺序：history → default → current；匹配失败则回退 default → current → history → 西安
  function getCurrentCityId() {
    var txt = txtCurLocation ? txtCurLocation.textContent.trim() : '';
    var cityName = txt.split(/\s+/).pop().replace(/市$/, '');

    var keys = [HISTORY_KEY, DEFAULT_KEY, CURRENT_KEY];
    for (var i = 0; i < keys.length; i++) {
      try {
        var raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        var list = Array.isArray(parsed) ? parsed : [parsed];
        for (var j = 0; j < list.length; j++) {
          if (list[j] && list[j].name && list[j].id) {
            if (list[j].name.replace(/市$/, '') === cityName) return list[j].id;
          }
        }
      } catch (e) { }
    }
    // 回退
    try {
      var def = JSON.parse(localStorage.getItem(DEFAULT_KEY) || 'null');
      if (def && def.id) return def.id;
      var cur = JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null');
      if (cur && cur.id) return cur.id;
      var hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (hist.length && hist[0].id) return hist[0].id;
    } catch (e) { }
    return '101110101'; // 西安
  }

  // 解析和风 fxTime（如 "2024-08-05T22:00+08:00"），取本地时间分量构造 Date
  function parseFxTime(fxTime) {
    var m = String(fxTime).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
  }

  // 判断某时刻是否为白天（日出后到日落前）
  function isDaytime(date, daily) {
    var ds = toDateStr(date);
    var dd = null;
    for (var i = 0; i < daily.length; i++) {
      if (daily[i].fxDate === ds) { dd = daily[i]; break; }
    }
    if (!dd || !dd.sunrise || !dd.sunset) {
      return date.getHours() >= 6 && date.getHours() < 19; // 回退
    }
    var sr = dd.sunrise.split(':');
    var ss = dd.sunset.split(':');
    var sunrise = new Date(date.getFullYear(), date.getMonth(), date.getDate(), +sr[0], +sr[1]);
    var sunset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), +ss[0], +ss[1]);
    return date >= sunrise && date < sunset;
  }

  // 根据天气文字和昼夜获取图标路径
  function getIconPath(text, daytime) {
    var file = (!daytime && nightIconOverride[text])
      ? nightIconOverride[text]
      : (weatherIconMap[text] || '01多云');
    return './img/' + (daytime ? 'weatherday' : 'weathernight') + '/' + file + '.png';
  }

  // ---------- 主逻辑：拉取数据并填充 li ----------
  function loadHourlyWeather() {
    if (typeof getWeatherHourly !== 'function' || typeof getWeatherDaily !== 'function') return;
    var cityId = getCurrentCityId();

    Promise.all([
      getWeatherHourly(cityId, '24h'),
      getWeatherDaily(cityId, '7d'),
      (typeof getWeatherNow === 'function') ? getWeatherNow(cityId) : Promise.resolve(null)
    ]).then(function (res) {
      var hRes = res[0], dRes = res[1], nRes = res[2];
      if (!hRes || !hRes.hourly || !hRes.hourly.length) return;
      if (!dRes || !dRes.daily || !dRes.daily.length) return;

      var hourly = hRes.hourly;
      var daily = dRes.daily;
      var now = new Date();
      var todayStr = toDateStr(now);

      // 收集每日的日出日落事件
      var sunEvents = [];
      daily.forEach(function (d) {
        var p = d.fxDate.split('-');
        var base = new Date(+p[0], +p[1] - 1, +p[2]);
        if (d.sunrise) {
          var sp = d.sunrise.split(':');
          sunEvents.push({
            type: 'sunrise',
            date: new Date(base.getFullYear(), base.getMonth(), base.getDate(), +sp[0], +sp[1]),
            label: d.sunrise
          });
        }
        if (d.sunset) {
          var sp2 = d.sunset.split(':');
          sunEvents.push({
            type: 'sunset',
            date: new Date(base.getFullYear(), base.getMonth(), base.getDate(), +sp2[0], +sp2[1]),
            label: d.sunset
          });
        }
      });

      // 合并 24 小时预报数据
      var allItems = [];
      // 检查 API 第一条是否为当前整点；若不是，用实时天气补充当前整点
      var currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
      var firstFx = parseFxTime(hourly[0].fxTime);
      var firstHour = firstFx ? new Date(firstFx.getFullYear(), firstFx.getMonth(), firstFx.getDate(), firstFx.getHours(), 0, 0) : null;
      if (firstHour && firstHour.getTime() !== currentHour.getTime() && nRes && nRes.now) {
        allItems.push({
          type: 'hourly',
          date: currentHour,
          temp: nRes.now.temp,
          text: (nRes.now.text || '').split('转')[0]
        });
      }
      hourly.forEach(function (h) {
        var dt = parseFxTime(h.fxTime);
        if (!dt) return;
        allItems.push({ type: 'hourly', date: dt, temp: h.temp, text: (h.text || '').split('转')[0] });
      });
      // 截取 24 条小时数据
      allItems = allItems.slice(0, 24);
      if (!allItems.length) return;

      var firstT = allItems[0].date.getTime();
      var lastT = allItems[allItems.length - 1].date.getTime();

      // 将落在 24 小时窗口内的日出日落事件加入列表
      sunEvents.forEach(function (evt) {
        var t = evt.date.getTime();
        if (t >= firstT && t <= lastT + 3600000) {
          allItems.push({ type: evt.type, date: evt.date, label: evt.label });
        }
      });

      // 按时间升序排序（日出日落自动穿插到对应整点之间）
      allItems.sort(function (a, b) { return a.date - b.date; });

      // 逐个填充 li 元素内容
      for (var i = 0; i < items.length; i++) {
        var li = items[i];
        var data = allItems[i];
        if (!data) { continue; }

        var timeP = li.querySelector('.text-time');
        var iconImg = li.querySelector('.icon');
        var degreeP = li.querySelector('.txt-degree');

        if (data.type === 'sunrise') {
          if (timeP) timeP.textContent = data.label;
          if (iconImg) { iconImg.src = './img/rise.png'; iconImg.alt = '日出'; iconImg.title = '日出'; }
          if (degreeP) degreeP.textContent = '日出';
        } else if (data.type === 'sunset') {
          if (timeP) timeP.textContent = data.label;
          if (iconImg) { iconImg.src = './img/set.png'; iconImg.alt = '日落'; iconImg.title = '日落'; }
          if (degreeP) degreeP.textContent = '日落';
        } else {
          // 整点时间
          var h = data.date.getHours();
          var isNextDay = toDateStr(data.date) !== todayStr;
          if (h === 0 && isNextDay) {
            if (timeP) timeP.textContent = '明天';
          } else {
            if (timeP) timeP.textContent = (h < 10 ? '0' + h : '' + h) + ':00';
          }
          // 白天/晚上图标
          var daytime = isDaytime(data.date, daily);
          if (iconImg) {
            iconImg.src = getIconPath(data.text, daytime);
            iconImg.alt = data.text;
            iconImg.title = data.text;
          }
          if (degreeP) degreeP.textContent = data.temp + '°';
        }
      }
    });
  }

  // 等待城市定位完成后加载
  function tryLoad() {
    var cityId = getCurrentCityId();
    if (cityId) {
      loadHourlyWeather();
    } else {
      setTimeout(tryLoad, 500);
    }
  }

  // 每小时刷新一次
  var lastHour = new Date().getHours();
  function refreshCheck() {
    var curHour = new Date().getHours();
    if (curHour !== lastHour) {
      lastHour = curHour;
      loadHourlyWeather();
    }
  }
  setInterval(refreshCheck, 60000);

  // 监听 txt-cur-location 变化，城市切换时重新加载
  if (txtCurLocation && typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function () {
      loadHourlyWeather();
    });
    observer.observe(txtCurLocation, { childList: true, characterData: true, subtree: true });
  }

  tryLoad();
})();

// ==================== 七日天气预报：调用API填充数据 ====================
// 仅修改 #lsweatherday 下 li 的元素内容（day / date / weather / icon / wind）
// 不改动任何 HTML 结构、CSS 样式或已有 JS 逻辑
(function () {
  var DEFAULT_KEY = 'tencent_weather_default_v1';
  var CURRENT_KEY = 'tencent_weather_current_v3';
  var HISTORY_KEY = 'tencent_weather_history_v2';

  // 天气文字 → 图标文件名映射
  var weatherIconMap = {
    '晴': '00晴', '多云': '01多云', '阴': '02阴',
    '阵雨': '03阵雨', '雷阵雨': '04雷阵雨',
    '小雨': '07小雨', '中雨': '08中雨', '大雨': '09大雨'
  };
  // 夜间文件夹中"雷阵雨"对应文件名不同
  var nightIconOverride = { '雷阵雨': '04打雷' };

  var weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  var lsWeatherDay = document.getElementById('lsweatherday');
  if (!lsWeatherDay) return;
  var items = lsWeatherDay.querySelectorAll('.item');
  if (!items.length) return;
  var txtCurLocation = document.querySelector('.txt-cur-location');

  // ---------- 工具函数 ----------
  function pad2(n) { return String(n).padStart(2, '0'); }

  function toDateStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function dateToApiStr(d) {
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  // 根据 txt-cur-location 文本匹配 localStorage 中的城市 ID
  function getCurrentCityId() {
    var txt = txtCurLocation ? txtCurLocation.textContent.trim() : '';
    var cityName = txt.split(/\s+/).pop().replace(/市$/, '');

    var keys = [HISTORY_KEY, DEFAULT_KEY, CURRENT_KEY];
    for (var i = 0; i < keys.length; i++) {
      try {
        var raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        var list = Array.isArray(parsed) ? parsed : [parsed];
        for (var j = 0; j < list.length; j++) {
          if (list[j] && list[j].name && list[j].id) {
            if (list[j].name.replace(/市$/, '') === cityName) return list[j].id;
          }
        }
      } catch (e) { }
    }
    try {
      var def = JSON.parse(localStorage.getItem(DEFAULT_KEY) || 'null');
      if (def && def.id) return def.id;
      var cur = JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null');
      if (cur && cur.id) return cur.id;
      var hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (hist.length && hist[0].id) return hist[0].id;
    } catch (e) { }
    return '101110101'; // 西安
  }

  // 解析 "2026-08-05" → Date（本地零点）
  function parseFxDate(fxDate) {
    var p = String(fxDate).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  // 解析 hourly.time "2026-08-05T14:00+08:00" → Date
  function parseHourlyTime(t) {
    var m = String(t).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
  }

  // 解析 "2026-08-05" + "05:58" → Date
  function parseSunTime(fxDate, timeStr) {
    var dp = fxDate.split('-');
    var tp = timeStr.split(':');
    return new Date(+dp[0], +dp[1] - 1, +dp[2], +tp[0], +tp[1]);
  }

  // 取对象中出现次数最多的 key
  function mostFrequent(countMap) {
    var best = null, max = 0;
    Object.keys(countMap).forEach(function (k) {
      if (countMap[k] > max) { max = countMap[k]; best = k; }
    });
    return best;
  }

  // 将 daily 项转为统一结构
  function dailyToDayData(d) {
    return {
      date: parseFxDate(d.fxDate),
      textDay: d.textDay || '',
      textNight: d.textNight || '',
      windDirDay: d.windDirDay || '',
      windScaleDay: d.windScaleDay || ''
    };
  }

  // 从历史天气的 weatherHourly 聚合白天/晚间代表天气及白天风向风力
  function aggregateHistorical(weatherDaily, weatherHourly) {
    var dateStr = weatherDaily.date;
    var date = parseFxDate(dateStr);
    var sr = weatherDaily.sunrise ? parseSunTime(dateStr, weatherDaily.sunrise) : null;
    var ss = weatherDaily.sunset ? parseSunTime(dateStr, weatherDaily.sunset) : null;

    var dayTexts = {}, nightTexts = {};
    var dayWindDirs = {}, dayWindScales = {};

    (weatherHourly || []).forEach(function (h) {
      var t = parseHourlyTime(h.time);
      if (!t) return;
      var isDay = sr && ss ? (t >= sr && t < ss) : (t.getHours() >= 6 && t.getHours() < 19);
      if (isDay) {
        if (h.text) dayTexts[h.text] = (dayTexts[h.text] || 0) + 1;
        if (h.windDir) dayWindDirs[h.windDir] = (dayWindDirs[h.windDir] || 0) + 1;
        if (h.windScale) dayWindScales[h.windScale] = (dayWindScales[h.windScale] || 0) + 1;
      } else {
        if (h.text) nightTexts[h.text] = (nightTexts[h.text] || 0) + 1;
      }
    });

    return {
      date: date,
      textDay: mostFrequent(dayTexts) || '晴',
      textNight: mostFrequent(nightTexts) || '晴',
      windDirDay: mostFrequent(dayWindDirs) || '微风',
      windScaleDay: mostFrequent(dayWindScales) || '1-3'
    };
  }

  // 填充 DOM
  function fillDom(dayData) {
    for (var i = 0; i < items.length; i++) {
      var li = items[i];
      var data = dayData[i];
      if (!data) continue;

      var dayP = li.querySelector('.day');
      var dateP = li.querySelector('.date');
      var dayWeatherP = li.querySelector('.ctdaytime .weather');
      var dayIconImg = li.querySelector('.ctdaytime .icon');
      var nightIconImg = li.querySelector('.ct-night .icon');
      var nightWeatherP = li.querySelector('.ct-night .weather');
      var windP = li.querySelector('.wind');

      // day：前两个保持"昨天"/"今天"，第三个起用周数
      if (dayP) {
        if (i === 0) dayP.textContent = '昨天';
        else if (i === 1) dayP.textContent = '今天';
        else dayP.textContent = weekDays[data.date.getDay()];
      }

      // date：两位数字日月补0，如 08月05日
      if (dateP) {
        dateP.textContent = pad2(data.date.getMonth() + 1) + '月' + pad2(data.date.getDate()) + '日';
      }

      // 白天天气和图标（weatherday 文件夹）
      if (dayWeatherP) dayWeatherP.textContent = data.textDay;
      if (dayIconImg) {
        var dayFile = weatherIconMap[data.textDay] || '01多云';
        dayIconImg.src = './img/weatherday/' + dayFile + '.png';
        dayIconImg.alt = data.textDay;
        dayIconImg.title = data.textDay;
      }

      // 晚间天气和图标（weathernight 文件夹）
      if (nightWeatherP) nightWeatherP.textContent = data.textNight;
      if (nightIconImg) {
        var nightFile = nightIconOverride[data.textNight] || weatherIconMap[data.textNight] || '01多云';
        nightIconImg.src = './img/weathernight/' + nightFile + '.png';
        nightIconImg.alt = data.textNight;
        nightIconImg.title = data.textNight;
      }

      // wind：风向 + 风力等级 + "级"，如"北风1-3级"
      if (windP) {
        windP.textContent = data.windDirDay + data.windScaleDay + '级';
      }
    }
  }

  // ---------- 主逻辑 ----------
  function loadSevenDayWeather() {
    if (typeof getWeatherDaily !== 'function' || typeof getHistoricalWeather !== 'function') return;
    var cityId = getCurrentCityId();
    if (!cityId) return;

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var yesterday = new Date(today.getTime() - 86400000);
    var todayStr = toDateStr(today);

    // 每个请求独立容错：历史天气对"今天"可能返回 400，不应影响整体
    function safe(p) { return p.then(function (v) { return v; }).catch(function () { return null; }); }

    Promise.all([
      safe(getWeatherDaily(cityId, '7d')),
      safe(getHistoricalWeather(cityId, dateToApiStr(yesterday))),
      safe(getHistoricalWeather(cityId, dateToApiStr(today)))
    ]).then(function (res) {
      var dailyRes = res[0], yestRes = res[1], todayRes = res[2];
      var daily = (dailyRes && dailyRes.daily) ? dailyRes.daily : [];

      var dayData = [];

      // 昨天（历史聚合）
      if (yestRes && yestRes.weatherDaily && yestRes.weatherHourly) {
        dayData.push(aggregateHistorical(yestRes.weatherDaily, yestRes.weatherHourly));
      } else {
        dayData.push(null);
      }

      // 今天：优先从 daily 中取（白天时段 daily[0] 通常为今天），否则用历史聚合
      var todayFromDaily = null;
      for (var i = 0; i < daily.length; i++) {
        if (daily[i].fxDate === todayStr) { todayFromDaily = daily[i]; break; }
      }
      if (todayFromDaily) {
        dayData.push(dailyToDayData(todayFromDaily));
      } else if (todayRes && todayRes.weatherDaily && todayRes.weatherHourly) {
        dayData.push(aggregateHistorical(todayRes.weatherDaily, todayRes.weatherHourly));
      } else if (daily.length > 0) {
        // 回退：daily[0] 视为今天
        dayData.push(dailyToDayData(daily[0]));
      } else {
        dayData.push(null);
      }

      // 明天及以后：取 fxDate > 今天的 daily 项
      var futureDays = daily.filter(function (d) { return d.fxDate > todayStr; });
      // 若 daily[0] 就是今天，futureDays 已排除今天；若 daily 从明天开始，futureDays 包含全部
      for (var j = 0; j < 6 && j < futureDays.length; j++) {
        dayData.push(dailyToDayData(futureDays[j]));
      }

      fillDom(dayData);
    }).catch(function (err) {
      console.error('七日预报获取失败:', err);
    });
  }

  // 等待城市定位完成后加载
  function tryLoad() {
    var cityId = getCurrentCityId();
    if (cityId) {
      loadSevenDayWeather();
    } else {
      setTimeout(tryLoad, 500);
    }
  }

  // 每小时检查一次：跨日时重新加载
  var lastDate = toDateStr(new Date());
  function refreshCheck() {
    var curDate = toDateStr(new Date());
    if (curDate !== lastDate) {
      lastDate = curDate;
      loadSevenDayWeather();
    }
  }
  setInterval(refreshCheck, 60000);

  // 监听 txt-cur-location 变化，城市切换时重新加载
  if (txtCurLocation && typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function () {
      loadSevenDayWeather();
    });
    observer.observe(txtCurLocation, { childList: true, characterData: true, subtree: true });
  }

  tryLoad();
})();
