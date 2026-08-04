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
