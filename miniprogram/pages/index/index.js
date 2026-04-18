const GOODS_KEY = "goods_list";
const RECORDS_KEY = "book_records";
const CUSTOMERS_KEY = "customers_list";

function formatTime(ts) {
  const date = new Date(ts);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function getDateOnly(ts) {
  const date = new Date(ts);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mergeCustomerList(localList, cloudList) {
  const map = {};
  localList.forEach((item) => {
    if (!item || !item.id) {
      return;
    }
    map[item.id] = item;
  });
  cloudList.forEach((item) => {
    map[item.id] = item;
  });
  return Object.values(map);
}

Page({
  data: {
    showEntryForm: false,
    goodsList: [],
    goodsOptionTexts: [],
    selectedGoodsIndex: 0,
    selectedGoodsId: "",
    customerList: [],
    customerOptionTexts: [],
    selectedCustomerIndex: 0,
    selectedCustomerId: "",
    entryPrice: "",
    suggestedPrice: "0.00",
    quantity: "1",
    currentAmount: "0.00",
    todayCount: 0,
    todayAmount: "0.00",
    recentRecords: [],
  },

  onShow() {
    this.loadData();
    this.syncCloudCustomers();
  },

  loadData() {
    const goodsList = wx.getStorageSync(GOODS_KEY) || [];
    const customerList = wx.getStorageSync(CUSTOMERS_KEY) || [];
    const records = wx.getStorageSync(RECORDS_KEY) || [];
    const goodsOptionTexts = goodsList.map((item) => item.name);
    const customerOptionTexts = customerList.map((item) => item.name);
    const selectedGoodsId = this.getValidGoodsId(goodsList, this.data.selectedGoodsId);
    const selectedGoodsIndex = this.getGoodsIndex(goodsList, selectedGoodsId);
    const selectedCustomerId = this.getValidCustomerId(customerList, this.data.selectedCustomerId);
    const selectedCustomerIndex = this.getCustomerIndex(customerList, selectedCustomerId);

    this.setData(
      {
        goodsList,
        customerList,
        goodsOptionTexts,
        customerOptionTexts,
        selectedGoodsId,
        selectedGoodsIndex,
        selectedCustomerId,
        selectedCustomerIndex,
        entryPrice: this.getCurrentGoodsPriceText(goodsList, selectedGoodsId),
        suggestedPrice: this.getCurrentGoodsPriceText(goodsList, selectedGoodsId),
        recentRecords: records.slice(0, 5),
      },
      () => {
        this.updateCurrentAmount();
        this.updateTodayStats(records);
      }
    );
  },

  syncCloudCustomers() {
    const app = getApp();
    if (!wx.cloud || !app.globalData.env) {
      return;
    }

    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: { type: "listCustomers" },
      })
      .then((resp) => {
        if (!resp.result || !resp.result.success) {
          return;
        }
        const cloudList = (resp.result.data || []).map((item) => ({
          id: `cloud_${item._id}`,
          name: item.name || "微信客户",
          phone: item.phone || "",
          source: "wechat_invite",
          customerOpenId: item.customerOpenId || "",
        }));
        const localList = wx.getStorageSync(CUSTOMERS_KEY) || [];
        const mergedList = mergeCustomerList(localList, cloudList);
        wx.setStorageSync(CUSTOMERS_KEY, mergedList);
        this.loadData();
      })
      .catch(() => {});
  },

  getValidGoodsId(goodsList, currentId) {
    if (currentId && goodsList.some((item) => item.id === currentId)) {
      return currentId;
    }
    return goodsList.length ? goodsList[0].id : "";
  },

  getGoodsIndex(goodsList, goodsId) {
    const idx = goodsList.findIndex((item) => item.id === goodsId);
    return idx < 0 ? 0 : idx;
  },

  getValidCustomerId(customerList, currentId) {
    if (currentId && customerList.some((item) => item.id === currentId)) {
      return currentId;
    }
    return customerList.length ? customerList[0].id : "";
  },

  getCustomerIndex(customerList, customerId) {
    const idx = customerList.findIndex((item) => item.id === customerId);
    return idx < 0 ? 0 : idx;
  },

  getCurrentGoodsPriceText(goodsList, goodsId) {
    const currentGoods = goodsList.find((item) => item.id === goodsId);
    if (!currentGoods || Number.isNaN(Number(currentGoods.price))) {
      return "0.00";
    }
    return Number(currentGoods.price).toFixed(2);
  },

  updateTodayStats(records) {
    const today = getDateOnly(Date.now());
    const todayRecords = records.filter((item) => getDateOnly(item.createdAt) === today);
    const todayAmount = todayRecords.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    this.setData({
      todayCount: todayRecords.length,
      todayAmount: todayAmount.toFixed(2),
    });
  },

  onTapAdd() {
    if (!this.data.goodsList.length) {
      wx.showModal({
        title: "请先添加商品",
        content: "你还没有商品，先去管理商品页创建商品明细。",
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: "/pages/goods/index" });
          }
        },
      });
      return;
    }
    if (!this.data.customerList.length) {
      wx.showModal({
        title: "请先添加客户",
        content: "每笔记录都需要对应买家，请先在管理客户中添加。",
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: "/pages/customers/index" });
          }
        },
      });
      return;
    }
    const defaultPrice = this.getCurrentGoodsPriceText(this.data.goodsList, this.data.selectedGoodsId);
    this.setData({
      showEntryForm: true,
      entryPrice: defaultPrice,
      suggestedPrice: defaultPrice,
    });
  },

  closeEntryForm() {
    this.setData({
      showEntryForm: false,
      entryPrice: this.getCurrentGoodsPriceText(this.data.goodsList, this.data.selectedGoodsId),
      suggestedPrice: this.getCurrentGoodsPriceText(this.data.goodsList, this.data.selectedGoodsId),
      quantity: "1",
    });
    this.updateCurrentAmount();
  },

  onGoodsChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.goodsList[idx];
    if (!selected) {
      return;
    }
    this.setData(
      {
        selectedGoodsIndex: idx,
        selectedGoodsId: selected.id,
        entryPrice: Number(selected.price).toFixed(2),
        suggestedPrice: Number(selected.price).toFixed(2),
      },
      () => this.updateCurrentAmount()
    );
  },

  onCustomerChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.customerList[idx];
    if (!selected) {
      return;
    }
    this.setData({
      selectedCustomerIndex: idx,
      selectedCustomerId: selected.id,
    });
  },

  onPriceInput(e) {
    this.setData({ entryPrice: e.detail.value }, () => this.updateCurrentAmount());
  },

  onQuantityInput(e) {
    this.setData({ quantity: e.detail.value }, () => this.updateCurrentAmount());
  },

  updateCurrentAmount() {
    const price = Number(this.data.entryPrice);
    const quantity = Number(this.data.quantity);
    if (Number.isNaN(price) || price <= 0 || Number.isNaN(quantity) || quantity <= 0) {
      this.setData({ currentAmount: "0.00" });
      return;
    }
    this.setData({ currentAmount: (price * quantity).toFixed(2) });
  },

  submitRecord() {
    const currentGoods = this.data.goodsList.find((item) => item.id === this.data.selectedGoodsId);
    const currentCustomer = this.data.customerList.find(
      (item) => item.id === this.data.selectedCustomerId
    );
    const price = Number(this.data.entryPrice);
    const quantity = Number(this.data.quantity);
    if (!currentGoods) {
      wx.showToast({ title: "请选择商品", icon: "none" });
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      wx.showToast({ title: "成交单价需大于0", icon: "none" });
      return;
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      wx.showToast({ title: "数量需大于0", icon: "none" });
      return;
    }
    if (!currentCustomer) {
      wx.showToast({ title: "请选择买家", icon: "none" });
      return;
    }

    const now = Date.now();
    const amount = Number((price * quantity).toFixed(2));
    const records = wx.getStorageSync(RECORDS_KEY) || [];
    const newRecord = {
      id: `${now}_${Math.floor(Math.random() * 1000)}`,
      goodsId: currentGoods.id,
      goodsName: currentGoods.name,
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      unit: currentGoods.unit,
      price,
      quantity,
      amount,
      createdAt: now,
      createdAtText: formatTime(now),
    };

    const nextRecords = [newRecord, ...records];
    wx.setStorageSync(RECORDS_KEY, nextRecords);
    this.setData(
      {
        entryPrice: this.getCurrentGoodsPriceText(this.data.goodsList, this.data.selectedGoodsId),
        suggestedPrice: this.getCurrentGoodsPriceText(this.data.goodsList, this.data.selectedGoodsId),
        quantity: "1",
        showEntryForm: false,
        recentRecords: nextRecords.slice(0, 5),
      },
      () => {
        this.updateCurrentAmount();
        this.updateTodayStats(nextRecords);
      }
    );

    wx.showToast({ title: "已记一笔", icon: "success" });
  },
});
