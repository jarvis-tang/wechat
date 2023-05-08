/*!
 * Fresns 微信小程序 (https://fresns.cn)
 * Copyright 2021-Present 唐杰
 * Licensed under the Apache-2.0 license
 */
import { fresnsApi } from '../../api/api';
import { fresnsConfig } from '../../api/tool/function';
import { repPluginUrl, generateRandomString } from '../../utils/fresnsUtilities';

Page({
  /** 外部 mixin 引入 **/
  mixins: [
    require('../../mixins/themeChanged'),
    require('../../mixins/checkSiteMode'),
    require('../../mixins/loginInterceptor'),
  ],

  /** 页面的初始数据 **/
  data: {
    // 提示条
    tipError: '',
    tipDelay: 3000,

    // 配置参数
    options: null,
    type: null,

    // 草稿选择器
    draftSelector: false,

    // 编辑器相关
    editorConfig: {},
    editorStatus: false,
    toolbarBottom: 0,
    contentCursorPosition: 0,
    showTitleInput: false,
    showMentionDialog: false,
    showHashtagDialog: false,

    // 草稿
    draftEdit: null,
    draftDetail: null,
    draftContentWordCount: 0, // 实时计算内容字数
  },

  /** 监听页面加载 **/
  onLoad: async function (options) {
    wx.setNavigationBarTitle({
      title: await fresnsConfig('menu_editor_functions'),
    });

    // 编辑器参数
    const type = options.type || 'post'; // 内容类型，帖子或评论
    const fsid = options.fsid; // 有值表示编辑已发表的内容
    const draftId = options.draftId; // 有值表示编辑指定草稿

    // 编辑器配置
    let editorService;
    let scene;
    let pid;
    let plid;
    let cid;
    let clid;
    switch (type) {
      case 'post':
        editorService = await fresnsConfig('post_editor_service');
        scene = 'postEditor';
        pid = fsid;
        plid = draftId;
        break;
      case 'comment':
        editorService = await fresnsConfig('comment_editor_service');
        scene = 'commentEditor';
        cid = fsid;
        clid = draftId;

        // 评论必填参数判断
        const commentPid = options.commentPid; // 评论哪个帖子
        if (!commentPid) {
          this.setData({
            tipError: '评论缺失 pid 参数',
            tipDelay: 20000,
            editorStatus: true, // 显示编辑器
          });

          return;
        }
        break;
      default:
        editorService = null;
        scene = 'postEditor';
        pid = fsid;
        plid = draftId;
    }

    this.setData({
      options: options,
      type: type,
    });

    /**
     * 如果配置了编辑器插件，则跳转到插件页面
     */
    if (editorService) {
      const newUrl = repPluginUrl(editorService, {
        type: type,
        scene: scene,
        pid: pid,
        plid: plid,
        cid: cid,
        clid: clid,
      });

      // 过滤 options 里指定参数
      const filteredOptions = Object.entries(options).filter(([key]) => key !== 'type');

      // 将过滤后的 options 对象转换为 URL 参数字符串
      const urlParams = filteredOptions
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      wx.redirectTo({
        url: '/pages/webview?url=' + newUrl + '&' + urlParams,
      });

      return;
    }

    /**
     * 没有插件编辑器，进入原生编辑器
     */
    const configRes = await fresnsApi.editor.editorConfig({
      type: type,
    });

    if (configRes.code === 0) {
      this.setData({
        editorConfig: configRes.data, // 编辑器配置
        draftSelector: true, // 草稿选择器
      });

      return;
    }

    this.setData({
      tipError: '[' + configRes.code + '] 编辑器配置加载失败',
      tipDelay: 20000,
    });
  },

  /** 监听页面显示 **/
  onShow: async function () {
    // 处理插件回调消息
    const postMessage = wx.getStorageSync('fresnsPluginMessage');
    console.log('fresnsPluginMessage', postMessage);

    if (postMessage?.postMessageKey == 'fresnsEditor') {
      const type = this.data.type;
      const draftDetail = this.data.draftDetail;

      const detailRes = await fresnsApi.editor.editorDetail({
        type: type,
        draftId: draftDetail.id,
      });

      if (detailRes.code === 0) {
        this.setData({
          draftDetail: detailRes.data,
        });
      }
    }
  },

  // 选择草稿
  onLoadDraft: async function (draftData) {
    wx.showNavigationBarLoading();

    const titleConfig = this.data.editorConfig.editor.toolbar.title;

    // 标题配置
    let showTitleInput = false;
    if (titleConfig.status && titleConfig.view) {
      showTitleInput = true;
    }
    if (draftData.detail.title) {
      showTitleInput = true;
    }

    this.setData({
      draftEdit: draftData.edit || null, // 录入草稿编辑配置
      draftDetail: draftData.detail, // 录入草稿数据
      draftSelector: false, // 关闭草稿选择器
      editorStatus: true, // 显示编辑器
      showTitleInput: showTitleInput, // 标题输入框是否显示
      contentCursorPosition: draftData.detail.content.length, // 获取内容光标位置
    });

    wx.hideNavigationBarLoading();
  },

  /** 以下为编辑器功能 **/

  // API 更新草稿
  apiUpdateDraft: async function (parameters) {
    const draftDetail = this.data.draftDetail;

    console.log('apiUpdateDraft', parameters);

    await fresnsApi.editor.editorUpdate({
      type: this.data.type,
      draftId: draftDetail.id,
      ...parameters,
    });
  },

  // 编辑器工具栏
  onToolbarBottom: function (toolbarBottom = 0) {
    this.setData({
      toolbarBottom: toolbarBottom,
    });
  },
  switchShowTitleInput() {
    this.setData({
      showTitleInput: !this.data.showTitleInput,
    });
  },
  switchShowMentionDialog() {
    this.setData({
      showMentionDialog: !this.data.showMentionDialog,
    });
  },
  switchShowHashtagDialog() {
    this.setData({
      showHashtagDialog: !this.data.showHashtagDialog,
    });
  },

  // 小组
  onGroupChange(group = {}) {
    const draftDetail = this.data.draftDetail;
    draftDetail.group = group;

    this.setData({
      draftDetail: draftDetail,
    });

    this.apiUpdateDraft({
      postGid: group?.gid ? group?.gid : '',
    });
  },

  // 标题
  onTitleChange(title) {
    const draftDetail = this.data.draftDetail;
    draftDetail.title = title;

    this.setData({
      draftDetail: draftDetail,
    });
  },
  onTitleSubmit(title) {
    const draftDetail = this.data.draftDetail;
    draftDetail.title = title;

    this.setData({
      draftDetail: draftDetail,
    });

    this.apiUpdateDraft({
      postTitle: title,
    });
  },

  // 内容
  onContentChange(content) {
    const draftDetail = this.data.draftDetail;
    draftDetail.content = content;

    this.setData({
      draftDetail: draftDetail,
    });
  },
  onContentCursor(cursorPosition) {
    this.setData({
      contentCursorPosition: cursorPosition,
    });
  },
  onContentInsert(text) {
    const draftDetail = this.data.draftDetail;
    const cursorPosition = this.data.contentCursorPosition;

    const prevCharacter = draftDetail.content.charAt(cursorPosition - 1); // 光标前一个字符
    const firstCharacterOfText = text.charAt(0); // 插入文本的第一个字符

    let newText = text;
    if (prevCharacter === firstCharacterOfText) {
      // 如果两个字符一样，避免重复，去除一个
      newText = text.slice(1);
    }

    const newContent =
      draftDetail.content.slice(0, cursorPosition) + newText + draftDetail.content.slice(cursorPosition);

    draftDetail.content = newContent;

    this.setData({
      draftDetail: draftDetail,
      contentCursorPosition: cursorPosition + text.length,
    });
  },
  onContentSubmit(content) {
    const draftDetail = this.data.draftDetail;
    draftDetail.content = content;

    this.setData({
      draftDetail: draftDetail,
    });

    this.apiUpdateDraft({
      content: content,
    });
  },

  // 位置
  onLocationChange(mapJson) {
    if (!mapJson) {
      return;
    }

    const draftDetail = this.data.draftDetail;
    draftDetail.mapJson = mapJson;

    this.setData({
      draftDetail: draftDetail,
    });

    this.apiUpdateDraft({
      map: mapJson,
    });
  },
  onLocationDelete() {
    const draftDetail = this.data.draftDetail;
    draftDetail.mapJson = {};

    this.setData({
      draftDetail: draftDetail,
    });

    this.apiUpdateDraft({
      deleteMap: true,
    });
  },

  // 是否匿名
  onAnonymousChange(isSelected) {
    const draftDetail = this.data.draftDetail;
    const isAnonymous = isSelected ? 1 : 0;
    draftDetail.isAnonymous = isAnonymous;

    this.setData({
      draftDetail: draftDetail,
    });

    this.apiUpdateDraft({
      isAnonymous: isAnonymous,
    });
  },

  // 文件
  onAddFiles(type = 'images', files) {
    const draftDetail = this.data.draftDetail;

    const fileArr = files.map((file) => {
      return {
        newChoice: true,
        waiting: true,
        fid: generateRandomString(16),
        size: file.size,
        imageConfigUrl: file.tempFilePath,
        imageRatioUrl: file.tempFilePath,
        imageSquareUrl: file.tempFilePath,
        imageBigUrl: file.tempFilePath,
        videoTime: file.duration,
        videoPosterUrl: file.thumbTempFilePath,
        videoUrl: file.tempFilePath,
      };
    });

    Array.prototype.push.apply(draftDetail.files[type], fileArr);

    this.setData({
      draftDetail: draftDetail,
    });
  },
  onDeleteFile: async function (type, fid) {
    const draftDetail = this.data.draftDetail;
    const typeKey = type + 's';

    const newFiles = draftDetail.files[typeKey].filter((file) => file.fid !== fid); // 仅保留与给定 fid 不同的文件

    draftDetail.files[typeKey] = newFiles;

    this.setData({
      draftDetail: draftDetail,
    });

    await this.apiUpdateDraft({
      deleteFile: fid,
    });
  },

  // 提交发表
  submitDraft: async function () {
    const draftDetail = this.data.draftDetail;

    await this.apiUpdateDraft({
      postTitle: draftDetail.title,
      content: draftDetail.content,
    });

    const submitRes = await fresnsApi.editor.editorPublish({
      type: this.data.type,
      draftId: draftDetail.id,
    });

    if (submitRes.code === 0) {
      wx.showToast({
        title: '提交成功',
        icon: 'success',
      });

      wx.redirectTo({
        url: '/pages/posts/index',
      });
    }
  },
});
