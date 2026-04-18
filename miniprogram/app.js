// app.js
const DEFAULT_GOODS = [
  {
    id: "preset_crab_small_roe",
    category: "海鲜",
    name: "小膏蟹",
    price: 68,
    unit: "斤",
  },
  {
    id: "preset_crab_big_roe",
    category: "海鲜",
    name: "大膏蟹",
    price: 98,
    unit: "斤",
  },
  {
    id: "preset_crab_flower",
    category: "海鲜",
    name: "花蟹",
    price: 76,
    unit: "斤",
  },
  {
    id: "preset_mantis_shrimp",
    category: "海鲜",
    name: "皮皮虾",
    price: 58,
    unit: "斤",
  },
  {
    id: "preset_scallop",
    category: "海鲜",
    name: "扇贝",
    price: 32,
    unit: "斤",
  },
];

App({
  onLaunch: function () {
    this.initDefaultGoods();
    this.globalData = {
      // env 参数说明：
      // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会请求到哪个云环境的资源
      // 此处请填入环境 ID, 环境 ID 可在微信开发者工具右上顶部工具栏点击云开发按钮打开获取
      env: "cloud1-d2g3rdl8i8b4dd2a0",
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },

  initDefaultGoods() {
    const hasSeeded = wx.getStorageSync("goods_seeded");
    if (hasSeeded) {
      return;
    }

    const storedGoods = wx.getStorageSync("goods_list");
    if (!Array.isArray(storedGoods) || !storedGoods.length) {
      wx.setStorageSync("goods_list", DEFAULT_GOODS);
    }

    wx.setStorageSync("goods_seeded", true);
  },
});
