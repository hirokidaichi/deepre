外部ライブラリの importをimport map使う形式に統一したい。 たとえば、

```
import { Command } from "jsr:@cliffy/command@^1.0.0-rc.7";
```

このような表記を無くしたい。

```
import { Command } from "@cliffy/command";
```

のような形に統一したい。

そのために、

```
deno add jsr:@cliffy/command@^1.0.0-rc.7
```

のようにdeno.jsonを更新して、その上で省略表記ができるようにしてください。

まずは、 grepで、 jsr:xxx や npm:xxx や https://xxx
のような表記があるソースコードを探索して、
すべてについての修正を計画し、実行してください。

修正後、`deno task check-all`を実行して、テストやチェックが通ることを確認して。
