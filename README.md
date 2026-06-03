# @penpot/ua-parser

Fork of [ua-parser-js](https://github.com/faisalman/ua-parser-js) started at commit
[`b3f4321`](https://github.com/faisalman/ua-parser-js/tree/b3f4321bb676723953aed2018e72f864754c91c2)
(before the [AGPLv3 license change](https://github.com/faisalman/ua-parser-js/commit/b5546ee)),
retaining the original MIT license.

## Usage

```js
import { parse } from '@penpot/ua-parser';

const result = parse('Mozilla/5.0 ...');
result.getBrowser(); // { name: 'Chrome', version: '120.0.0.0', major: '120', type: undefined }
result.getOS();      // { name: 'Windows', version: '10' }
```

See [AGENTS.md](./AGENTS.md) for the full API reference.

## License

MIT
