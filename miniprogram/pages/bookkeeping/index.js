const GOODS_KEY = "goods_list";
const RECORDS_KEY = "book_records";

function formatTime(ts) {
  const date = new Date(ts);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

Page({
  data: {
    goodsList: [],
    records: [],
    selectedGoodsId: "",
    selectedGoodsName: "",
    selectedGoodsIndex: 0,
    quantity: "1",
    remark: "",
    currentAmount: "0.00",
    totalAmount: "0.00",
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const goodsList = wx.getStorageSync(GOODS_KEY) || [];
    const records = wx.getStorageSync(RECORDS_KEY) || [];
    const selectedGoodsId = this.getInitialSelectedId(goodsList);
    const selectedGoodsIndex = goodsList.findIndex((item) => item.id === selectedGoodsId);
    const currentGoods = goodsList[selectedGoodsIndex] || null;
    this.setData(
      {
        goodsList,
        records,
        selectedGoodsId,
        selectedGoodsIndex: selectedGoodsIndex < 0 ? 0 : selectedGoodsIndex,
        selectedGoodsName: currentGoods ? currentGoods.name : "",
      },
      () => {
        this.updateCurrentAmount();
        this.updateTotalAmount();
      }
    );
  },

  getInitialSelectedId(goodsList) {
    const current = this.data.selectedGoodsId;
    if (current && goodsList.some((item) => item.id === current)) {
      return current;
    }
    if (!goodsList.length) {
      return "";
    }
    return goodsList[0].id;
  },

  onGoodsChange(e) {
    const idx = Number(e.detail.value);
    const selected = this.data.goodsList[idx];
    if (!selected) {
      return;
    }
    this.setData(
      {
        selectedGoodsId: selected.id,
        selectedGoodsName: selected.name,
        selectedGoodsIndex: idx,
      },
      () => this.updateCurrentAmount()
    );
  },

  onQuantityInput(e) {
    this.setData(
      {
        quantity: e.detail.value,
      },
      () => this.updateCurrentAmount()
    );
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  updateCurrentAmount() {
    const currentGoods = this.data.goodsList.find(
      (item) => item.id === this.data.selectedGoodsId
    );
    const quantity = Number(this.data.quantity);
    if (!currentGoods || Number.isNaN(quantity) || quantity <= 0) {
      this.setData({ currentAmount: "0.00" });
      return;
    }
    const amount = currentGoods.price * quantity;
    this.setData({ currentAmount: amount.toFixed(2) });
  },

  addRecord() {
    const currentGoods = this.data.goodsList.find(
      (item) => item.id === this.data.selectedGoodsId
    );
    const quantity = Number(this.data.quantity);

    if (!currentGoods) {
      wx.showToast({ title: "请先添加商品", icon: "none" });
      return;
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      wx.showToast({ title: "数量需大于0", icon: "none" });
      return;
    }

    const amount = Number((currentGoods.price * quantity).toFixed(2));
    const now = Date.now();
    const newRecord = {
      id: `${now}_${Math.floor(Math.random() * 1000)}`,
      goodsId: currentGoods.id,
      goodsName: currentGoods.name,
      unit: currentGoods.unit,
      price: currentGoods.price,
      quantity,
      amount,
      remark: this.data.remark.trim(),
      createdAt: now,
      createdAtText: formatTime(now),
    };

    const nextRecords = [newRecord, ...this.data.records];
    wx.setStorageSync(RECORDS_KEY, nextRecords);
    this.setData(
      {
        records: nextRecords,
        quantity: "1",
        remark: "",
      },
      () => {
        this.updateCurrentAmount();
        this.updateTotalAmount();
      }
    );

    wx.showToast({ title: "记账成功", icon: "success" });
  },

  onDeleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const nextRecords = this.data.records.filter((item) => item.id !== id);
    wx.setStorageSync(RECORDS_KEY, nextRecords);
    this.setData({ records: nextRecords }, () => this.updateTotalAmount());
  },

  updateTotalAmount() {
    const total = this.data.records.reduce((sum, item) => sum + Number(item.amount), 0);
    this.setData({ totalAmount: total.toFixed(2) });
  },

  clearRecords() {
    wx.showModal({
      title: "清空记录",
      content: "确认清空所有记账记录吗？",
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        wx.setStorageSync(RECORDS_KEY, []);
        this.setData({ records: [] }, () => this.updateTotalAmount());
      },
    });
  },

  goGoodsPage() {
    wx.navigateTo({ url: "/pages/goods/index" });
  },
});
