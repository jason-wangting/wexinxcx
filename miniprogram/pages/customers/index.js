const CUSTOMERS_KEY = "customers_list";

Page({
  data: {
    customerList: [],
    formName: "",
    formPhone: "",
    editId: "",
    inviteId: "",
    invitePath: "",
    cloudEnabled: false,
  },

  onShow() {
    this.loadCustomers();
    this.syncCloudCustomers();
  },

  loadCustomers() {
    const customerList = wx.getStorageSync(CUSTOMERS_KEY) || [];
    this.setData({ customerList });
  },

  mergeCustomerList(localList, cloudList) {
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
  },

  syncCloudCustomers() {
    const app = getApp();
    if (!wx.cloud || !app.globalData.env) {
      this.setData({ cloudEnabled: false });
      return;
    }

    this.setData({ cloudEnabled: true });
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
        const mergedList = this.mergeCustomerList(localList, cloudList);
        wx.setStorageSync(CUSTOMERS_KEY, mergedList);
        this.setData({ customerList: mergedList });
      })
      .catch(() => {});
  },

  createInvite() {
    const app = getApp();
    if (!wx.cloud || !app.globalData.env) {
      wx.showModal({
        title: "云环境未配置",
        content: "请先在 miniprogram/app.js 配置 env，才能使用微信邀请绑定。",
        showCancel: false,
      });
      return;
    }

    wx.showLoading({ title: "生成中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: { type: "createCustomerInvite" },
      })
      .then((resp) => {
        if (!resp.result || !resp.result.success) {
          wx.showToast({ title: "生成失败", icon: "none" });
          return;
        }
        this.setData({
          inviteId: resp.result.inviteId,
          invitePath: resp.result.path,
        });
        wx.showModal({
          title: "邀请已生成",
          content: "点击“分享邀请”转发给客户，客户点开后可一键绑定。",
          showCancel: false,
        });
      })
      .catch(() => {
        wx.showToast({ title: "生成失败", icon: "none" });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  copyInvitePath() {
    if (!this.data.invitePath) {
      wx.showToast({ title: "请先生成邀请", icon: "none" });
      return;
    }
    wx.setClipboardData({
      data: this.data.invitePath,
      success: () => {
        wx.showToast({ title: "链接已复制", icon: "success" });
      },
    });
  },

  onShareAppMessage() {
    const path = this.data.invitePath || "/pages/index/index";
    return {
      title: "邀请你成为我的买家",
      path,
    };
  },

  onNameInput(e) {
    this.setData({ formName: e.detail.value.trim() });
  },

  onPhoneInput(e) {
    this.setData({ formPhone: e.detail.value.trim() });
  },

  submitCustomer() {
    const { formName, formPhone, editId, customerList } = this.data;
    if (!formName) {
      wx.showToast({ title: "请填写客户名称", icon: "none" });
      return;
    }

    let nextList = customerList.slice();
    if (editId) {
      nextList = nextList.map((item) => {
        if (item.id !== editId) {
          return item;
        }
        return {
          ...item,
          name: formName,
          phone: formPhone,
        };
      });
      wx.showToast({ title: "更新成功", icon: "success" });
    } else {
      nextList.unshift({
        id: `${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: formName,
        phone: formPhone,
      });
      wx.showToast({ title: "添加成功", icon: "success" });
    }

    wx.setStorageSync(CUSTOMERS_KEY, nextList);
    this.setData({
      customerList: nextList,
      formName: "",
      formPhone: "",
      editId: "",
    });
  },

  onEditCustomer(e) {
    const { id } = e.currentTarget.dataset;
    const customer = this.data.customerList.find((item) => item.id === id);
    if (!customer) {
      return;
    }
    this.setData({
      editId: customer.id,
      formName: customer.name,
      formPhone: customer.phone || "",
    });
  },

  onDeleteCustomer(e) {
    const { id } = e.currentTarget.dataset;
    if (id.startsWith("cloud_")) {
      wx.showToast({ title: "微信绑定客户暂不支持删除", icon: "none" });
      return;
    }
    wx.showModal({
      title: "删除客户",
      content: "删除后不可恢复，确认删除吗？",
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        const nextList = this.data.customerList.filter((item) => item.id !== id);
        wx.setStorageSync(CUSTOMERS_KEY, nextList);
        this.setData({ customerList: nextList });
        if (this.data.editId === id) {
          this.resetForm();
        }
      },
    });
  },

  resetForm() {
    this.setData({
      editId: "",
      formName: "",
      formPhone: "",
    });
  },
});
