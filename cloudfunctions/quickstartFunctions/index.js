const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const ensureCollection = async (collectionName) => {
  try {
    await db.createCollection(collectionName);
  } catch (e) {
    // Collection may already exist.
  }
};

const buildInviteId = () => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `inv_${Date.now()}_${randomPart}`;
};
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

const createCustomerInvite = async () => {
  const wxContext = cloud.getWXContext();
  const ownerOpenId = wxContext.OPENID;

  await ensureCollection("customer_invites");
  await ensureCollection("customers");

  const inviteId = buildInviteId();
  await db.collection("customer_invites").add({
    data: {
      inviteId,
      ownerOpenId,
      status: "active",
      createdAt: db.serverDate(),
    },
  });

  return {
    success: true,
    inviteId,
    path: `/pages/customerBind/index?inviteId=${inviteId}`,
  };
};

const acceptCustomerInvite = async (event) => {
  const inviteId = event.inviteId;
  if (!inviteId) {
    return {
      success: false,
      errMsg: "inviteId is required",
    };
  }

  await ensureCollection("customer_invites");
  await ensureCollection("customers");

  const inviteResp = await db
    .collection("customer_invites")
    .where({
      inviteId,
      status: "active",
    })
    .limit(1)
    .get();

  if (!inviteResp.data.length) {
    return {
      success: false,
      errMsg: "invite is invalid",
    };
  }

  const wxContext = cloud.getWXContext();
  const customerOpenId = wxContext.OPENID;
  const ownerOpenId = inviteResp.data[0].ownerOpenId;

  if (customerOpenId === ownerOpenId) {
    return {
      success: false,
      errMsg: "owner cannot bind self",
    };
  }

  const existedResp = await db
    .collection("customers")
    .where({
      ownerOpenId,
      customerOpenId,
    })
    .limit(1)
    .get();

  if (existedResp.data.length) {
    return {
      success: true,
      existed: true,
      customer: existedResp.data[0],
    };
  }

  const fallbackName = `微信客户${customerOpenId.slice(-4)}`;
  const customerName = (event.name || "").trim() || fallbackName;
  const phone = (event.phone || "").trim();

  const addResp = await db.collection("customers").add({
    data: {
      ownerOpenId,
      customerOpenId,
      name: customerName,
      phone,
      source: "wechat_invite",
      inviteId,
      createdAt: db.serverDate(),
    },
  });

  return {
    success: true,
    existed: false,
    customer: {
      _id: addResp._id,
      ownerOpenId,
      customerOpenId,
      name: customerName,
      phone,
      source: "wechat_invite",
      inviteId,
    },
  };
};

const listCustomers = async () => {
  const wxContext = cloud.getWXContext();
  const ownerOpenId = wxContext.OPENID;

  await ensureCollection("customers");

  const resp = await db
    .collection("customers")
    .where({ ownerOpenId })
    .limit(200)
    .get();

  return {
    success: true,
    data: resp.data,
  };
};

// const getOpenId = require('./getOpenId/index');
// const getMiniProgramCode = require('./getMiniProgramCode/index');
// const createCollection = require('./createCollection/index');
// const selectRecord = require('./selectRecord/index');
// const updateRecord = require('./updateRecord/index');
// const fetchGoodsList = require('./fetchGoodsList/index');
// const genMpQrcode = require('./genMpQrcode/index');
// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    case "createCustomerInvite":
      return await createCustomerInvite();
    case "acceptCustomerInvite":
      return await acceptCustomerInvite(event);
    case "listCustomers":
      return await listCustomers();
  }
};
