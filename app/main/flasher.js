const { dialog } = require('electron');
const exec = require('child_process').exec;
const path = require('path');
const Utils = require('../src/js/utils');
const platform = process.platform;

class Flasher {
    static get firmwareDirectory() {
        return path.resolve('app', 'custom_modules', 'flasher');
    }

    constructor() {
        this.avrFileList = ['avrdude', 'avrdude.conf', 'avrdude.exe', 'libusb0.dll'];
    }

    _getAppPath() {
        const asarIndex = __dirname.indexOf('app.asar');
        if (asarIndex > -1) {
            const asarPath = __dirname.substr(0, asarIndex);
            Utils.copyRecursiveSync(__dirname, path.join(asarPath, 'flasher'));
            return asarPath;
        } else {
            return Flasher.firmwareDirectory;
            // return path.join(__dirname, '..');
        }
    }

    flashArduino(firmware, port, options) {
        return new Promise((resolve, reject) => {
            const appPath = this._getAppPath(firmware);
            const baudRate = options.baudRate || '115200';
            const MCUType = options.MCUType || ' m328p';

            let avrName;
            let avrConf;
            let portPrefix;

            switch (platform) {
                case 'darwin':
                    avrName = './firmwares/core/avrdude';
                    avrConf = './firmwares/core/avrdude.conf';
                    portPrefix = '';
                    break;
                default:
                    avrName = './firmwares/core/avrdude.exe';
                    avrConf = './firmwares/core/avrdude.conf';
                    portPrefix = '\\\\.\\';
                    break;
            }
            const cmd = [
                avrName,
                ' -p',
                MCUType,
                ' -P',
                portPrefix,
                port,
                ' -b',
                baudRate,
                ' -Uflash:w:"',
                firmware,
                '.hex":i -C',
                avrConf,
                ' -carduino -D',
            ];

            this.flasherProcess = exec(
                cmd.join(''),
                {
                    cwd: path.resolve(appPath, 'flasher'),
                },
                (...args) => {
                    resolve(args);
                },
            );
        });
    }

    flashCopy(firmware, port, options, callBack) {
        return this._getAppPath(firmware).then((appPath) => new Promise((resolve, reject) => {
            const destPath = dialog.showOpenDialog({
                properties: ['openDirectory'],
            });
            if (!destPath) {
                return resolve(['경로 미선택']);
            }
            Utils.copyFile(
                path.join(appPath, 'flasher', `${firmware.name}.hex`),
                path.join(destPath[0], `${firmware.name}.hex`),
            ).then(() => {
                resolve([]);
            }).catch((err) => {
                resolve([err]);
            });
        }));
    }

    flash(firmware, port, options) {
        if (typeof firmware === 'string' || firmware.type === 'arduino') {
            return this.flashArduino(firmware, port, options);
        } else if (firmware.type === 'copy') {
            return this.flashCopy(firmware, port, options);
        }
    }

    kill() {
        if (this.flasherProcess) {
            this.flasherProcess.kill();
            this.flasherProcess = undefined;
        }
    }
}

module.exports = new Flasher();