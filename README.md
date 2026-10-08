# legal-binder-tools

Small, dependency-free JavaScript helpers for assembling legal binders and productions:

- **Bates numbering**: format Bates labels and assign page ranges across several documents.
- **Exhibit labels**: number exhibits 1, 2, 3 / A, B, C (rolling over to AA, AB, ...) / I, II, III, add a party heading ("PLAINTIFF'S EXHIBIT 12"), expand sticker ranges, and build an exhibit list as CSV or Markdown.
- **Tab cut math**: for a set of index tabs and a 1/N cut, work out the banks, each tab's position, and the tab length along an 11" (or other) edge.
- **Binder size**: from sheets, tab dividers and sheet protectors to a stack thickness and the smallest round ring and D-ring that hold it.

Plain ES modules, no dependencies, Node.js 18 or newer. The functions are deterministic and do no I/O, so they also run in a browser.

## Install

From GitHub:

```sh
npm install github:anselmoindex/legal-binder-tools
```

Or install the command-line tool globally, or run it once without installing:

```sh
npm install -g github:anselmoindex/legal-binder-tools
npx github:anselmoindex/legal-binder-tools --help
```

## Command line

```console
$ legal-binder-tools bates --prefix ABC --start 1 --count 5
ABC000001
ABC000002
ABC000003
ABC000004
ABC000005

$ legal-binder-tools bates --prefix SMITH --digits 3 --start 998 --count 3 --suffix=-CONF
SMITH998-CONF
SMITH999-CONF
SMITH1000-CONF
```

Padding never truncates: a number wider than `--digits` prints in full. A suffix that starts with a dash needs the `--suffix=-CONF` form.

```console
$ legal-binder-tools exhibits --party "Defendant's" --numbering letters --count 3
DEFENDANT'S EXHIBIT A
DEFENDANT'S EXHIBIT B
DEFENDANT'S EXHIBIT C

$ legal-binder-tools sequence --style letters --start Y --count 4
Y
Z
AA
AB
```

Exhibit list from a text file with one description per line (use `--file -` to read stdin):

```console
$ legal-binder-tools list --file exhibits.txt --prefix PX-
No.,Description,Marked,Offered,Admitted
PX-1,"Purchase agreement, March 2024",,,
PX-2,"Email from J. Doe, ""re: delivery"", 4/2/24",,,
PX-3,Invoice 1043 | unpaid,,,

$ legal-binder-tools list --file exhibits.txt --format markdown
| No. | Description | Marked | Offered | Admitted |
| --- | --- | --- | --- | --- |
| 1 | Purchase agreement, March 2024 |  |  |  |
| 2 | Email from J. Doe, "re: delivery", 4/2/24 |  |  |  |
| 3 | Invoice 1043 \| unpaid |  |  |  |
```

The Marked, Offered and Admitted columns are left blank to fill in during the hearing.

Which tab cut to order for 12 tabs:

```console
$ legal-binder-tools cut --tabs 12
Recommended: 1/6 cut, 2 bank(s), tabs 1.67" long

cut   banks  layout          tab length
1/6   2      1 x 6 + 6       1.67"
1/7   2      1 x 7 + 5       1.43"
1/8   2      1 x 8 + 4       1.25"
1/9   2      1 x 9 + 3       1.11"
1/10  2      1 x 10 + 2      1.00"
1/4   3      2 x 4 + 4       2.50"
1/5   3      2 x 5 + 2       2.00"
1/3   4      3 x 3 + 3       3.33"
```

Where each tab falls on the edge for a given cut:

```console
$ legal-binder-tools cut --tabs 7 --cut 5
1/5 cut, 11" edge, 10" working length: 2 bank(s), tabs 2.00" long
tab 1: bank 1, position 1, 0.50" to 2.50" from the top
tab 2: bank 1, position 2, 2.50" to 4.50" from the top
tab 3: bank 1, position 3, 4.50" to 6.50" from the top
tab 4: bank 1, position 4, 6.50" to 8.50" from the top
tab 5: bank 1, position 5, 8.50" to 10.50" from the top
tab 6: bank 2, position 1, 0.50" to 2.50" from the top
tab 7: bank 2, position 2, 2.50" to 4.50" from the top
```

Binder size for 250 sheets of 20# paper plus 10 tab dividers, and the full capacity chart:

```console
$ legal-binder-tools binder --sheets 250 --tabs 10
Stack: 1.07" (1.23" with 15% headroom)
Round ring: 2"
D-ring:     1-1/2"

$ legal-binder-tools chart
ring      20# round 24# round 28# round 20# D     24# D     28# D
1/2"      91        77        62        118       101       81
1"        182       155       125       237       202       163
1-1/2"    273       232       188       356       303       245
2"        365       310       251       474       404       327
3"        547       465       377       712       606       491
4"        -         -         -         949       808       655
5"        -         -         -         1187      1010      818
```

Every command accepts `--json` for machine-readable output.

## Library

```js
import {
  batesRanges, exhibitIds, exhibitLabel, exhibitList, exhibitListCsv,
  generateSequence, recommendCut, tabLayout, binderPlan,
} from "legal-binder-tools";

batesRanges(
  [{ name: "Contract.pdf", pages: 3 }, { name: "Emails.pdf", pages: 2 }],
  { prefix: "SMITH", start: 1, digits: 6 },
).map((r) => `${r.first} - ${r.last}`);
// ["SMITH000001 - SMITH000003", "SMITH000004 - SMITH000005"]

exhibitIds({ numbering: "letters", start: "Y" }, 4); // ["Y", "Z", "AA", "AB"]
exhibitIds({ prefix: "PX-", start: 101 }, 3);         // ["PX-101", "PX-102", "PX-103"]
exhibitLabel("Plaintiff's", "12");                    // "PLAINTIFF'S EXHIBIT 12"
generateSequence("roman", 1, 5);                      // ["I", "II", "III", "IV", "V"]

recommendCut(12);
// { cut: 6, banks: 2, lastBank: 6, tabIn: 1.6666666666666667, exact: true }

tabLayout(7, 5).positions[5];
// { tab: 6, bank: 2, position: 1, startIn: 0.5, endIn: 2.5, tabIn: 2 }

const plan = binderPlan({ sheets: 250, tabs: 10 });
plan.round.label; // '2"'
plan.dRing.label; // '1-1/2"'
```

### API

| Module | Exports |
| --- | --- |
| Bates | `batesNumber`, `batesSequence`, `batesRanges`, `BATES_LIMITS` |
| Sequences | `toRoman`, `toLetters`, `lettersToIndex`, `generateSequence`, `SEQUENCE_STYLES`, `MONTHS` |
| Exhibits | `exhibitIds`, `letterFor`, `exhibitHeading`, `exhibitLabel`, `defaultStampColor`, `expandStickerLabels`, `parseDescriptions`, `exhibitList`, `exhibitListCsv`, `exhibitListMarkdown`, `PARTIES`, `EXHIBIT_LIMITS`, `EXHIBIT_LIST_COLUMNS` |
| Tab cut | `cutOptions`, `recommendCut`, `tabLayout`, `workingLength`, `STANDARD_CUTS`, `EDGES`, `WORKING_EDGE_IN`, `DIE_MARGIN_IN`, `TAB_EXTENSION_IN` |
| Binder | `binderPlan`, `sheetsAt`, `capacityChart`, `PAPER`, `TAB_STOCK`, `RINGS`, `ROUND_FACTOR`, `D_FACTOR`, `HEADROOM`, `PROTECTOR_CALIPER` |

Each function is documented with JSDoc in `src/`.

## How the numbers work

**Letters** follow spreadsheet-column order: A to Z, then AA, AB, ... AZ, BA, ... ZZ, AAA.

**Roman numerals** clamp values below 1 to I (there is no Roman zero). Standard notation ends at 3999 (MMMCMXCIX); larger values repeat M (4000 is MMMM).

**Tab cuts.** A 1/N cut divides the tabbed edge into N positions. Tabs cascade down the edge one position per divider, and after N dividers the pattern starts again at the top; each run of N is a bank. The die needs 1" of margin along the edge (0.5" at each end), so an 11" letter edge has a 10" working length, a 14" legal edge 13", and an 8.5" bottom edge 7.5". Tab length is the working length divided by N. `recommendCut` compares the cuts 1/3 to 1/10 and picks the fewest banks among cuts whose tabs are at least 1" long, preferring a cut that fills every bank.

**Binder size.** The stack is sheets × paper caliper + tab dividers × tab caliper + sheet protectors × 0.006". A ring is recommended only if it holds the stack plus 15% headroom. A round ring holds about 73% of its nominal size before pages drag on the curve; a D-ring about 95%. Round rings are listed only up to 3".

| Material | Caliper |
| --- | --- |
| 20# bond (copy paper) | 0.004" |
| 24# bond | 0.0047" |
| 28# bond | 0.0058" |
| 90# index tab | 0.007" |
| 110# index tab | 0.0085" |
| .015 poly tab | 0.015" |
| Loaded sheet protector | 0.006" |

These calipers are typical trade values. Paper varies by mill and humidity, so treat results as planning figures, not guarantees.

Colors, party headings and exhibit formats vary by court. Check your local rules.

## Tests

```sh
npm test
```

Uses the built-in `node:test` runner; there is nothing to install.

## About

Maintained by Tabzoola (https://tabzoola.com), the custom index tab and binder divider maker run by Anselmo Die & Index in Schaumburg, Illinois (making index tabs since 1993). The same logic powers the free tools at:

- [Bates numbering](https://tabzoola.com/bates-numbering)
- [PDF exhibit stamp](https://tabzoola.com/pdf-exhibit-stamp)
- [Exhibit sticker maker](https://tabzoola.com/exhibit-sticker-maker)
- [Exhibit list maker](https://tabzoola.com/exhibit-list-maker)
- [Tab cut calculator](https://tabzoola.com/tab-cut-calculator)
- [Binder size calculator](https://tabzoola.com/binder-size-calculator)
- [Binder capacity chart](https://tabzoola.com/binder-capacity-chart)
- [Tab divider dimensions](https://tabzoola.com/tab-divider-dimensions)

The website tools also stamp PDFs and produce printable sheets in the browser; this package contains only the numbering and arithmetic behind them. Roman-numeral exhibit numbers, exhibit letters that start somewhere other than A, the CSV and Markdown exhibit-list output, and `batesRanges` taking page counts instead of PDF files are additions in this package.

## License

MIT. See [LICENSE](LICENSE).
