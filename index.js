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
