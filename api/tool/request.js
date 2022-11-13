/*!
 * Fresns 微信小程序 (https://fresns.org)
 * Copyright 2021-Present Jarvis Tang
 * Licensed under the Apache-2.0 license
 */
import { globalInfo } from '../../configs/fresnsGlobalInfo';
import { navigateToSignin } from '../../util/navigateToSignin';
import appConfig from '../../configs/fresnsConfig';
import { getSign, sign } from './sign';

const deviceInfoPaths = [
    '/api/v1/info/sendVerifyCode',
    '/api/v1/info/uploadLog',
    '/api/v1/info/downloadFile',
    '/api/v1/account/register',
    '/api/v1/account/login',
    '/api/v1/account/delete',
    '/api/v1/account/restore',
    '/api/v1/account/reset',
    '/api/v1/account/edit',
    '/api/v1/user/auth',
    '/api/v1/user/edit',
    '/api/v1/dialog/send',
    '/api/v1/editor/create',
    '/api/v1/editor/publish',
    '/api/v1/editor/submit',
];

export function request(options) {
    return new Promise(async (resolve, reject) => {
        const { url, data = {} } = options;

        Object.getOwnPropertyNames(data).forEach((dataKey) => {
            if (data[dataKey] === null || data[dataKey] === undefined || data[dataKey] === '') {
                delete data[dataKey];
            }
        });

        const header = Object.assign(
            {
                platform: appConfig.platform,
                version: '1.0.0',
                appId: appConfig.appId,
                timestamp: parseInt(new Date().valueOf() / 1000 + ''),
            },
            globalInfo.langTag && { langTag: globalInfo.langTag },
            globalInfo.timezone && { timezone: globalInfo.timezone },
            globalInfo.aid && { aid: globalInfo.aid },
            globalInfo.uid && { uid: globalInfo.uid },
            globalInfo.token && { token: globalInfo.token },
            globalInfo.deviceInfo &&
                deviceInfoPaths.includes(options.url) && { deviceInfo: JSON.stringify(globalInfo.deviceInfo) }
        );

        const sign = await getSign();
        wx.request({
            method: 'POST',
            header: Object.assign(header, {
                sign,
            }),
            url: appConfig.apiHost + url,
            data: data,
            success: (res) => {
                if (res.statusCode !== 200) {
                    wx.showToast({
                        title: '接口请求异常',
                        icon: 'none',
                    });
                    reject(res);
                    return;
                }

                const { code, message } = res.data;

                if (code !== 0) {
                    wx.showToast({
                        title: message,
                        icon: 'none',
                    });
                }

                if ([30111, 30112].includes(code)) {
                    navigateToSignin();
                    resolve(res.data);
                    return;
                }

                resolve(res.data);
            },
            fail: (res) => {
                wx.showToast({
                    title: '接口请求异常',
                    icon: 'none',
                });
                reject(res);
            },
        });
    });
}

export function uploadFile(filePath, options) {
    return new Promise(async (resolve, reject) => {
        const { url, data = {} } = options;

        Object.getOwnPropertyNames(data).forEach((dataKey) => {
            if (!data[dataKey]) {
                delete data[dataKey];
            }
        });

        const header = Object.assign(
            {
                platform: appConfig.platform,
                version: '1.0.0',
                appId: appConfig.appId,
                timestamp: parseInt(new Date().valueOf() / 1000 + ''),
            },
            globalInfo.langTag && { langTag: globalInfo.langTag },
            globalInfo.timezone && { timezone: globalInfo.timezone },
            globalInfo.aid && { aid: globalInfo.aid },
            globalInfo.uid && { uid: globalInfo.uid },
            globalInfo.token && { token: globalInfo.token },
            globalInfo.deviceInfo && { deviceInfo: JSON.stringify(globalInfo.deviceInfo) }
        );

        wx.uploadFile({
            header: Object.assign(header, {
                sign: await sign(header, appConfig.appSecret),
            }),
            url: appConfig.apiHost + url,
            filePath: filePath,
            name: 'file',
            formData: data,
            success: (res) => {
                const resData = JSON.parse(res.data);
                if (resData.code !== 0) {
                    wx.showToast({
                        title: resData.message,
                        icon: 'none',
                    });
                }
                resolve(resData);
            },
            fail: (res) => {
                reject(res);
            },
        });
    });
}
