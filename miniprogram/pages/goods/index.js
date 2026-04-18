const STORAGE_KEY = "goods_list";

Page({
  data: {
    goodsList: [],
    formName: "",
    formPrice: "",
    formUnit: "",
    editId: "",
  },

  onShow() {
    this.loadGoodsList();
  },

  loadGoodsList() {
    const goodsList = wx.getStorageSync(STORAGE_KEY) || [];
    this.setData({ goodsList });
  },

  onNameInput(e) {
    this.setData({ formName: e.detail.value.trim() });
  },

  onPriceInput(e) {
    this.setData({ formPrice: e.detail.value });
  },

  onUnitInput(e) {
    this.setData({ formUnit: e.detail.value.trim() });
  },

  submitGoods() {
    const { formName, formPrice, formUnit, editId, goodsList } = this.data;
    const price = Number(formPrice);

    if (!formName || !formUnit || !formPrice) {
      wx.showToast({ title: "请填写完整", icon: "none" });
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      wx.showToast({ title: "单价格式不正确", icon: "none" });
      return;
    }

    let nextList = goodsList.slice();

    if (editId) {
      nextList = nextList.map((item) => {
        if (item.id !== editId) {
          return item;
        }
        return {
          ...item,
          name: formName,
          price,
          unit: formUnit,
        };
      });
      wx.showToast({ title: "更新成功", icon: "success" });
    } else {
      nextList.unshift({
        id: `${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: formName,
        price,
        unit: formUnit,
      });
      wx.showToast({ title: "添加成功", icon: "success" });
    }

    wx.setStorageSync(STORAGE_KEY, nextList);
    this.setData({
      goodsList: nextList,
      formName: "",
      formPrice: "",
      formUnit: "",
      editId: "",
    });
  },

  onEditGoods(e) {
    const { id } = e.currentTarget.dataset;
    const goods = this.data.goodsList.find((item) => item.id === id);
    if (!goods) {
      return;
    }
    this.setData({
      editId: goods.id,
      formName: goods.name,
      formPrice: String(goods.price),
      formUnit: goods.unit,
    });
  },

  onDeleteGoods(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: "删除商品",
      content: "删除后该商品不可恢复，确认删除吗？",
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        const nextList = this.data.goodsList.filter((item) => item.id !== id);
        wx.setStorageSync(STORAGE_KEY, nextList);
        this.setData({ goodsList: nextList });
        if (this.data.editId === id) {
          this.setData({
            editId: "",
            formName: "",
            formPrice: "",
            formUnit: "",
          });
        }
        wx.showToast({ title: "已删除", icon: "success" });
      },
    });
  },

  resetForm() {
    this.setData({
      editId: "",
      formName: "",
      formPrice: "",
      formUnit: "",
    });
  },
});
