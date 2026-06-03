import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse, is, toString, BROWSER, CPU, DEVICE, ENGINE, OS } from '../../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data', 'ua');

function readJSON(file) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function readJSONFiles(dir) {
    const list = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
            list.push(...readJSON(path.join(dir, entry.name)));
        }
    }
    return list;
}

const browsers = readJSON(path.join(dataDir, 'browser', 'browser-all.json'));
const cpus = readJSON(path.join(dataDir, 'cpu', 'cpu-all.json'));
const devices = readJSONFiles(path.join(dataDir, 'device'));
const engines = readJSON(path.join(dataDir, 'engine', 'engine-all.json'));
const os = readJSONFiles(path.join(dataDir, 'os'));

const fixtures = [
    { title: 'getBrowser()', label: 'browser', list: browsers },
    { title: 'getCPU()', label: 'cpu', list: cpus },
    { title: 'getDevice()', label: 'device', list: devices },
    { title: 'getEngine()', label: 'engine', list: engines },
    { title: 'getOS()', label: 'os', list: os },
];

// ---- Entry point ----

describe('parse() entry point', () => {
    it('should not throw with no arguments', () => {
        assert.doesNotThrow(() => parse().getAll());
    });

    it('should not throw with undefined ua', () => {
        assert.doesNotThrow(() => parse(undefined).getAll());
    });

    it('should not throw with empty string', () => {
        assert.doesNotThrow(() => parse('').getAll());
    });
});

// ---- Enums ----

describe('Enumerated constants', () => {
    it('should have BROWSER enums', () => {
        assert.strictEqual(BROWSER.NAME, 'name');
        assert.strictEqual(BROWSER.VERSION, 'version');
        assert.strictEqual(BROWSER.MAJOR, 'major');
        assert.strictEqual(BROWSER.TYPE, 'type');
    });

    it('should have CPU enums', () => {
        assert.strictEqual(CPU.ARCHITECTURE, 'architecture');
    });

    it('should have DEVICE enums', () => {
        assert.strictEqual(DEVICE.MODEL, 'model');
        assert.strictEqual(DEVICE.VENDOR, 'vendor');
        assert.strictEqual(DEVICE.TYPE, 'type');
    });

    it('should have ENGINE enums', () => {
        assert.strictEqual(ENGINE.NAME, 'name');
        assert.strictEqual(ENGINE.VERSION, 'version');
    });

    it('should have OS enums', () => {
        assert.strictEqual(OS.NAME, 'name');
        assert.strictEqual(OS.VERSION, 'version');
    });
});

// ---- Fixture-driven tests ----

for (const method of fixtures) {
    describe(`[${method.title}]`, () => {
        for (const unit of method.list) {
            describe(`[${unit.desc}]: "${unit.ua}"`, () => {
                const actual = parse(unit.ua).getAll()[method.label];
                for (const [key, val] of Object.entries(unit.expect)) {
                    it(`should return ${key}: ${val}`, () => {
                        assert.strictEqual(String(val), String(actual[key]));
                    });
                }
            });
        }
    });
}

// ---- UA accessor ----

describe('Original UA string', () => {
    it('should return the user agent string', () => {
        const ua = 'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.6 (KHTML, like Gecko) Chrome/20.0.1090.0 Safari/536.6';
        const parser = parse(ua);
        assert.strictEqual(parser.getUA(), ua);
    });
});

// ---- Parsed result ----

describe('Full result set', () => {
    it('should return expected shape for empty UA', () => {
        assert.deepStrictEqual(parse('').getAll(), {
            ua: '',
            browser: { name: undefined, version: undefined, major: undefined, type: undefined },
            cpu: { architecture: undefined },
            device: { vendor: undefined, model: undefined, type: undefined },
            engine: { name: undefined, version: undefined },
            os: { name: undefined, version: undefined }
        });
    });

    it('should work even when Array.prototype has been mangled', () => {
        const result = withMangledArrayProto(() => parse('').getAll());

        function withMangledArrayProto(fn, key = 'isEmpty', value = function () { return this.length === 0; }) {
            const originalValue = Array.prototype[key];
            const restore = Object.hasOwnProperty.call(Array.prototype, key)
                ? () => { Array.prototype[key] = originalValue; }
                : () => { delete Array.prototype[key]; };

            Array.prototype[key] = value;
            const rst = fn();
            restore();
            return rst;
        }

        assert.deepStrictEqual(result, {
            ua: '',
            browser: { name: undefined, version: undefined, major: undefined, type: undefined },
            cpu: { architecture: undefined },
            device: { vendor: undefined, model: undefined, type: undefined },
            engine: { name: undefined, version: undefined },
            os: { name: undefined, version: undefined }
        });
    });
});

// ---- Custom regex ----

describe('Custom regex overrides', () => {
    const uaString = 'Mozilla/5.0 MyOwnBrowser/1.3';
    const myOwnBrowser = [[/(myownbrowser)\/((\d+)?[\w.]+)/i], [BROWSER.NAME, BROWSER.VERSION, BROWSER.MAJOR]];

    it('should detect custom browser with extensions', () => {
        const parser1 = parse(uaString, { browser: myOwnBrowser });
        assert.strictEqual(parser1.getBrowser().name, 'MyOwnBrowser');
        assert.strictEqual(parser1.getBrowser().version, '1.3');
        assert.strictEqual(parser1.getBrowser().major, '1');
    });

    it('should detect custom browser name via extensions alone', () => {
        const parser2 = parse(uaString, { browser: myOwnBrowser });
        assert.strictEqual(parser2.getBrowser().name, 'MyOwnBrowser');
        assert.strictEqual(parser2.getBrowser().version, '1.3');
    });

    it('should support type override in custom browser regex', () => {
        const myOwnListOfBrowsers = [
            [/(mybrowser)\/([\w.]+)/i], [BROWSER.NAME, BROWSER.VERSION, ['type', 'bot']]
        ];
        const myUA = 'Mozilla/5.0 MyBrowser/1.3';
        const myParser = parse(myUA, { browser: myOwnListOfBrowsers });
        assert.deepStrictEqual(myParser.getBrowser(), { name: 'MyBrowser', version: '1.3', major: '1', type: 'bot' });
        assert.strictEqual(is(myParser.getBrowser(), 'bot'), true);
    });

    it('should support custom device regex', () => {
        const myOwnListOfDevices = [
            [/(mytab) ([\w ]+)/i], [DEVICE.VENDOR, DEVICE.MODEL, [DEVICE.TYPE, DEVICE.TABLET]],
            [/(myphone)/i], [DEVICE.VENDOR, [DEVICE.TYPE, DEVICE.MOBILE]]
        ];
        const myUA2 = 'Mozilla/5.0 MyTab 14 Pro Max';
        const myParser2 = parse(myUA2, {
            browser: [[/(mybrowser)\/([\w.]+)/i], [BROWSER.NAME, BROWSER.VERSION, ['type', 'bot']]],
            device: myOwnListOfDevices
        });
        assert.deepStrictEqual(myParser2.getDevice(), { vendor: 'MyTab', model: '14 Pro Max', type: 'tablet' });
    });

    it('should support multiple extension objects in array', () => {
        const myOwnListOfBrowsers = [
            [/(mybrowser)\/([\w.]+)/i], [BROWSER.NAME, BROWSER.VERSION, ['type', 'bot']]
        ];
        const myOwnListOfDevices = [
            [/(mytab) ([\w ]+)/i], [DEVICE.VENDOR, DEVICE.MODEL, [DEVICE.TYPE, DEVICE.TABLET]],
        ];
        const myParser3 = parse('Mozilla/5.0 MyTab 14 Pro Max', [
            { browser: myOwnListOfBrowsers },
            { device: myOwnListOfDevices }
        ]);
        assert.deepStrictEqual(myParser3.getDevice(), { vendor: 'MyTab', model: '14 Pro Max', type: 'tablet' });
    });
});

// ---- Whitespace ----

describe('Trailing whitespace handling', () => {
    it('should preserve trailing space', () => {
        const uastring = '     Opera/9.21 (Windows NT 5.1; U; ru)     ';
        const { ua } = parse(uastring).getAll();
        assert.strictEqual(ua, 'Opera/9.21 (Windows NT 5.1; U; ru)     ');
    });
});

// ---- Length limit ----

describe('UA length cap', () => {
    const UA_MAX_LENGTH = 500;

    const uaString = 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; (R1 1.6); SLCC1; .NET CLR 2.0.50727; InfoPath.2; OfficeLiveConnector.1.3; OfficeLivePatch.0.0; .NET CLR 3.5.30729; .NET CLR 3.0.30618; 66760635803; runtime 11.00294; 876906799603; 97880703; 669602703; 9778063903; 877905603; 89670803; 96690803; 8878091903; 7879040603; 999608065603; 799808803; 6666059903; 669602102803; 888809342903; 696901603; 788907703; 887806555703; 97690214703; 66760903; 968909903; 796802422703; 8868026703; 889803611803; 898706903; 977806408603; 976900799903; 9897086903; 88780803; 798802301603; 9966008603; 66760703; 97890452603; 9789064803; 96990759803; 99960107703; 8868087903; 889801155603; 78890703; 8898070603; 89970603; 89970539603; 89970488703; 8789007603; 87890903; 877904603; 9887077703; 798804903; 97890264603; 967901703; 87890703; 97690420803; 79980706603; 9867086703; 996602846703; 87690803; 6989010903; 977809603; 666601903; 876905337803; 89670603; 89970200903; 786903603; 696901911703; 788905703; 896709803; 96890703; 998601903; 88980703; 666604769703; 978806603; 7988020803; 996608803; 788903297903; 98770043603; 899708803; 66960371603; 9669088903; 69990703; 99660519903; 97780603; 888801803; 9867071703; 79780803; 9779087603; 899708603; 66960456803; 898706824603; 78890299903; 99660703; 9768079803; 977901591603; 89670605603; 787903608603; 998607934903; 799808573903; 878909603; 979808146703; 9996088603; 797803154903; 69790603; 99660565603; 7869028603; 896707703; 97980965603; 976907191703; 88680703; 888809803; 69690903; 889805523703; 899707703; 997605035603; 89970029803; 9699094903; 877906803; 899707002703; 786905857603; 69890803; 97980051903; 997603978803; 9897097903; 66960141703; 7968077603; 977804603; 88980603; 989700803; 999607887803; 78690772803; 96990560903; 98970961603; 9996032903; 9699098703; 69890655603; 978903803; 698905066803; 977806903; 9789061703; 967903747703; 976900550903; 88980934703; 8878075803; 8977028703; 97980903; 9769006603; 786900803; 987706827703; 98770676303; 96760503; 877803603; 898702803; 878803703; 98770976703; 87870903; 88880803; 797705703; 886709603; 97670903; 979700432703; 98770270203';

    it(`greater than ${UA_MAX_LENGTH} should be trimmed down`, () => {
        assert.strictEqual(parse(uaString).getUA().length, UA_MAX_LENGTH);
    });
});

// ---- is() matcher ----

describe('is() identity matcher', () => {
    it('should match full name', () => {
        const uap = parse('Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 635) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537');
        assert.strictEqual(uap.getBrowser().name, 'IEMobile');
        assert.strictEqual(is(uap.getBrowser(), 'IEMobile'), true);
        assert.strictEqual(is(uap.getBrowser(), 'IE'), false);
        assert.strictEqual(is(uap.getBrowser(), '11.0'), false);
    });

    it('should ignore "Browser" suffix', () => {
        const uap = parse('Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 635) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537');
        assert.strictEqual(is(uap.getBrowser(), 'IEMobile Browser'), true);
    });

    it('should ignore case', () => {
        const uap = parse('Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 635) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537');
        assert.strictEqual(uap.getEngine().name, 'Trident');
        assert.strictEqual(is(uap.getEngine(), 'tRiDeNt'), true);
        assert.strictEqual(is(uap.getEngine(), '7.0'), false);
    });

    it('should get exact OS name', () => {
        const uap = parse('Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 635) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537');
        assert.strictEqual(uap.getOS().name, 'Windows Phone');
        assert.strictEqual(is(uap.getOS(), 'Windows Phone'), true);
        assert.strictEqual(is(uap.getOS(), 'Windows Phone OS'), true);
        assert.strictEqual(is(uap.getOS(), 'Windows Mobile'), false);
        assert.strictEqual(is(uap.getOS(), 'Android'), false);
    });

    it('should check all device properties', () => {
        const uap = parse('Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 635) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537');
        assert.deepStrictEqual(uap.getDevice(), { vendor: 'Nokia', model: 'Lumia 635', type: 'mobile' });
        assert.strictEqual(is(uap.getDevice(), 'Nokia'), true);
        assert.strictEqual(is(uap.getDevice(), 'Lumia 635'), true);
        assert.strictEqual(is(uap.getDevice(), 'mobile'), true);
        assert.strictEqual(is(uap.getAll().device, 'Nokia'), true);
    });

    it('should match across all component types', () => {
        const uap = parse('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36');
        assert.strictEqual(uap.getOS().name, 'macOS');
        assert.strictEqual(is(uap.getOS(), 'Mac OS'), true);
        assert.strictEqual(is(uap.getOS(), 'macOS'), true);
        assert.strictEqual(is(uap.getOS(), 'mac OS'), true);

        assert.strictEqual(is(uap.getOS(), 'M ac'), false);
        assert.strictEqual(is(uap.getOS(), 'M      a c   '), false);
        assert.strictEqual(is(uap.getOS(), 'Mac OS OS'), false);
        assert.strictEqual(is(uap.getOS(), 'Mac OS X'), false);

        assert.strictEqual(is(uap.getBrowser(), 'Chrome'), true);
        assert.strictEqual(is(uap.getEngine(), 'Blink'), true);
    });

    it('should not match "undefined" string before checking all properties', () => {
        const uap = parse('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36');
        assert.strictEqual(is(uap.getDevice(), 'undefined'), false);
        assert.strictEqual(is(uap.getDevice(), 'Apple'), true);

        const empty = parse('');
        assert.strictEqual(empty.getDevice().model, undefined);
        assert.strictEqual(is(empty.getDevice(), 'undefined'), false);
        assert.strictEqual(is(empty.getDevice(), undefined), true);
    });

    it('should accept exact arch name', () => {
        const uap = parse('Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:19.0) Gecko/20100101 Firefox/19.0');
        assert.strictEqual(uap.getCPU().architecture, 'ia32');
        assert.strictEqual(is(uap.getCPU(), 'ia32'), true);
        assert.strictEqual(is(uap.getCPU(), 'x86'), false);

        const uap2 = parse('Opera/9.80 (X11; Linux x86_64; U; Linux Mint; en) Presto/2.2.15 Version/10.10');
        assert.strictEqual(uap2.getCPU().architecture, 'amd64');
        assert.strictEqual(is(uap2.getCPU(), 'amd64'), true);
        assert.strictEqual(is(uap2.getCPU(), 'x86-64'), false);
        assert.strictEqual(is(uap2.getCPU(), 'x64'), false);
    });
});

// ---- toString() formatter ----

describe('toString() stringifier', () => {
    it('should return full name', () => {
        const uap = parse('Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 635) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537');
        assert.strictEqual(uap.getBrowser().name, 'IEMobile');
        assert.strictEqual(uap.getBrowser().version, '11.0');
        assert.strictEqual(uap.getBrowser().major, '11');
        assert.strictEqual(toString(uap.getBrowser()), 'IEMobile 11.0');

        assert.strictEqual(uap.getCPU().architecture, 'arm');
        assert.strictEqual(toString(uap.getCPU()), 'arm');

        assert.strictEqual(uap.getDevice().vendor, 'Nokia');
        assert.strictEqual(uap.getDevice().model, 'Lumia 635');
        assert.strictEqual(uap.getDevice().type, 'mobile');
        assert.strictEqual(toString(uap.getDevice()), 'Nokia Lumia 635');

        assert.strictEqual(uap.getEngine().name, 'Trident');
        assert.strictEqual(uap.getEngine().version, '7.0');
        assert.strictEqual(toString(uap.getEngine()), 'Trident 7.0');

        assert.strictEqual(uap.getOS().name, 'Windows Phone');
        assert.strictEqual(uap.getOS().version, '8.1');
        assert.strictEqual(toString(uap.getOS()), 'Windows Phone 8.1');
    });
});
