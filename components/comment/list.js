/*!
 * Fresns 微信小程序 (https://fresns.org)
 * Copyright 2021-Present Jarvis Tang
 * Licensed under the Apache-2.0 license
 */
import { callPageFunction } from '../../util/callPageFunction'
import { getCurPage } from '../../util/getCurPage'

Component({
  options: {
    multipleSlots: true, // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    fsui: String,
    comment: Object,
  },
  /**
   * 组件的初始数据
   */
  data: {
    imageFiles: [],
    videoFiles: [],
    audioFiles: [],
    docFiles: [],
    iconsObj: {},
  },
  /**
   * 组件的方法列表
   */
  methods: {
    onClickCommentLike: async function (e) {
      callPageFunction('onClickCommentLike', this.data.comment)
    },
    onClickComment: async function () {
      const { comment } = this.data
      const curRoute = '/' + getCurPage().route
      if (curRoute !== '/pages/comments/detail') {
        wx.navigateTo({
          url: `/pages/comments/detail?cid=${comment.cid}`,
        })
      }
    },
    onClickShare: async function () {
      callPageFunction('onClickShare', this.data.comment)
    },
    onClickCreateComment: async function () {},
    onClickModifyComment: async function (e) {
      const { comment } = this.data
      wx.navigateTo({
        url: `/pages/editor/index?type=comment&mode=modify&uuid=${comment.cid}&post_id=${comment.pid}`,
      })
    },
  },
  observers: {
    'comment': function (comment) {
      comment.icons = [
        {
          icon: 'a',
          name: 'cc',
        }, {
          icon: 'b',
          name: 'dc',
        },
      ]
      this.setData({
        imageFiles: comment.files.filter(file => file.type === 1),
        videoFiles: comment.files.filter(file => file.type === 2),
        audioFiles: comment.files.filter(file => file.type === 3),
        docFiles: comment.files.filter(file => file.type === 4),
        iconsObj: comment.icons.reduce((obj, icon) => {
          obj[icon.name] = icon
          return obj
        }, {}),
      })
    },
  },
})
