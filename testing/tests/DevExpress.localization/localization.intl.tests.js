import sharedTests from "./sharedParts/localization.shared.js";
import dateLocalization from "localization/date";
import numberLocalization from "localization/number";
import { locale } from "localization/core";
import config from "core/config";

if(Intl.__disableRegExpRestore) {
    Intl.__disableRegExpRestore();
}

const SYMBOLS_TO_REMOVE_REGEX = /[\u200E\u200F]/g;

QUnit.module("Intl localization", {
    before: () => {
        dateLocalization.inject({
            format: function(value, format) {
                // NOTE: IntlPolyfill uses CLDR data, so it formats this format with ` at `, but real browser`s Intl uses `, ` separator.
                let result = this.callBase.apply(this, arguments);
                if(typeof result === "string") {
                    result = result && result.replace(" at ", ", ");
                }
                return result;
            }
        });

        numberLocalization.inject({
            format: function(value, format) {
                // NOTE: IntlPolifill rounding bug. In real Intl it works OK.
                let result = this.callBase.apply(this, arguments);
                if(value === 4.645 && format.type === "fixedPoint" && format.precision === 2 && result === "4.64") {
                    result = "4.65";
                }
                return result;
            }
        });
    }
}, () => {
    sharedTests();

    const locales = [ "de", "en", "ja", "ru", "zh", "ar", "hr", "el", "ca" ];
    locales.forEach((localeId) => {
        const getIntlNumberFormatter = (format) => {
            return (new Intl.NumberFormat(localeId, format)).format;
        };

        const localizeDigits = string => {
            return string && string.split("").map(sign => {
                if(/[0-9]/.test(sign)) {
                    return getIntlNumberFormatter()(Number(sign));
                }

                return sign;
            }).join("");
        };

        QUnit.module("number - " + localeId, {
            beforeEach: function() {
                locale(localeId);
            },
            afterEach: function() {
                locale("en");
            }
        });

        QUnit.test("format", assert => {
            const separators = {
                de: ",",
                ru: ",",
                ar: "٫",
                hr: ",",
                el: ",",
                ca: ",",
                default: "."
            };
            const separator = separators[localeId] || separators.default;

            function getLocalizedFixedNumber(integerPart, fractionPart) {
                return localizeDigits(integerPart + separator + fractionPart);
            }
            const assertData = [
                {
                    value: 43789,
                    format: "decimal",
                    intlFormat: {
                        maximumFractionDigits: 0,
                        minimumIntegerDigits: 1,
                        round: "floor",
                        useGrouping: false
                    }
                },
                { value: 437, format: { type: "decimal" }, expected: localizeDigits("437") },
                { value: 437, format: { type: "decimal", precision: 5 }, expected: localizeDigits("00437") },
                { value: 2, format: { type: "decimal", precision: 2 }, expected: localizeDigits("02") },
                { value: 12, format: { type: "decimal", precision: 2 }, expected: localizeDigits("12") },
                { value: 2, format: { type: "decimal", precision: 3 }, expected: localizeDigits("002") },
                { value: 12, format: { type: "decimal", precision: 3 }, expected: localizeDigits("012") },
                { value: 123, format: { type: "decimal", precision: 3 }, expected: localizeDigits("123") },

                { value: 12.345, format: "fixedPoint", expected: localizeDigits("12") },
                { value: 12.345, format: { type: "fixedPoint" }, expected: localizeDigits("12") },
                { value: 1, format: { type: "fixedPoint", precision: null }, expected: localizeDigits("1") },
                { value: 1.2, format: { type: "fixedPoint", precision: null }, expected: getLocalizedFixedNumber(1, 2) },
                { value: 1.22, format: { type: "fixedPoint", precision: null }, expected: getLocalizedFixedNumber(1, 22) },
                { value: 1.222, format: { type: "fixedPoint", precision: null }, expected: getLocalizedFixedNumber(1, 222) },
                { value: 1.2225, format: { type: "fixedPoint", precision: null }, expected: getLocalizedFixedNumber(1, 2225) },
                { value: 1.22222228, format: { type: "fixedPoint", precision: null }, expected: getLocalizedFixedNumber(1, 22222228) },
                {
                    value: 12.345,
                    format: { type: "fixedPoint", precision: 1 },
                    intlFormat: { maximumFractionDigits: 1, minimumFractionDigits: 1 }
                },
                {
                    value: 12.345,
                    format: { type: "fixedPoint", precision: 2 },
                    intlFormat: { maximumFractionDigits: 2, minimumFractionDigits: 2 }
                },
                {
                    value: 12.34,
                    format: { type: "fixedPoint", precision: 3 },
                    intlFormat: { maximumFractionDigits: 3, minimumFractionDigits: 3 }
                },

                { value: 0.45, format: "percent", intlFormat: { style: "percent" } },
                { value: 0.45, format: { type: "percent" }, intlFormat: { style: "percent" } },
                { value: 0.45, format: { type: "percent", precision: 2 }, intlFormat: { style: "percent", minimumFractionDigits: 2 } },

                {
                    value: 1204,
                    format: "currency",
                    intlFormat: { style: "currency", currency: "USD", minimumFractionDigits: 0 }
                },
                {
                    value: 12,
                    format: { type: "currency" },
                    intlFormat: { style: "currency", currency: "USD", minimumFractionDigits: 0 } },
                {
                    value: 1,
                    format: { type: "currency", precision: 2 },
                    intlFormat: { style: "currency", currency: "USD" }
                },
                {
                    value: 1,
                    format: { type: "currency", precision: 3 },
                    intlFormat: { style: "currency", currency: "USD", minimumFractionDigits: 3 }
                },
                {
                    value: 1,
                    format: { type: "currency", precision: 2, currency: "USD" },
                    intlFormat: { style: "currency", currency: "USD", minimumFractionDigits: 2 }
                },
                {
                    value: -1204,
                    format: { type: "currency", precision: 2 },
                    intlFormat: { style: "currency", currency: "USD", minimumFractionDigits: 2 }
                },

                {
                    value: 12345.67,
                    format: { type: "currency largeNumber", precision: 2 },
                    expected: getIntlNumberFormatter({ style: "currency", currency: "USD", minimumFractionDigits: 2 })(12.34567).replace(/(\d|.$)(\D*)$/, "$1K$2")
                },
                {
                    value: 12345.67,
                    format: { type: "currency thousands", precision: 2 },
                    expected: getIntlNumberFormatter({ style: "currency", currency: "USD", minimumFractionDigits: 2 })(12.34567).replace(/(\d|.$)(\D*)$/, "$1K$2")
                },
                {
                    value: 12345.67,
                    format: { type: "currency millions", precision: 3 },
                    expected: getIntlNumberFormatter({ style: "currency", currency: "USD", minimumFractionDigits: 3 })(0.012).replace(/(\d|.$)(\D*)$/, "$1M$2")
                }
            ];

            assertData.forEach(data => {
                let expected = data.expected;

                if(data.intlFormat) {
                    expected = getIntlNumberFormatter(data.intlFormat)(data.value, data.intlFormat);
                    assert.equal(numberLocalization.format(data.value, data.intlFormat), expected);
                }

                assert.equal(numberLocalization.format(data.value, data.format), expected);
            });
        });

        QUnit.test("formatter caching", assert => {
            const originalIntl = window.Intl;
            let count = 0;
            const IntlMock = {
                NumberFormat: function() {
                    count++;
                    this.format = () => {
                        return "";
                    };
                }
            };

            try {
                window.Intl = IntlMock;
                numberLocalization.format(1, { type: "currency", precision: 42 });
                numberLocalization.format(2, { type: "currency", precision: 42 });
                assert.equal(count, 1);
            } finally {
                window.Intl = originalIntl;
            }
        });

        QUnit.test("parse", assert => {
            assert.equal(numberLocalization.parse(getIntlNumberFormatter({ maximumFractionDigits: 0, minimumFractionDigits: 0 })(437)), 437);
            assert.equal(numberLocalization.parse(getIntlNumberFormatter({ maximumFractionDigits: 1, minimumFractionDigits: 1 })(1.2)), 1.2);
            assert.equal(numberLocalization.parse(getIntlNumberFormatter({ maximumFractionDigits: 0, minimumFractionDigits: 0 })(12000)), 12000);
            assert.equal(numberLocalization.parse(getIntlNumberFormatter({ maximumFractionDigits: 0, minimumFractionDigits: 0 })(-10)), -10);

            assert.equal(numberLocalization.parse(getIntlNumberFormatter({ style: "currency", currency: "USD", minimumFractionDigits: 1 })(1.2)), 1.2);
        });

        QUnit.test("format by a function", assert => {
            assert.equal(numberLocalization.format(437, value => { return "!" + value; }), "!437");
            assert.equal(numberLocalization.format(437, { formatter: function(value) { return "!" + value; } }), "!437");
        });

        QUnit.test("parse by a function", assert => {
            assert.equal(numberLocalization.parse("!437", { parser: function(text) { return Number(text.substr(1)); } }), 437);
        });

        QUnit.test("parse long string", assert => {
            assert.ok(isNaN(numberLocalization.parse("1111111111111111111111111111111111111")));
        });

        QUnit.module("currency", {
            beforeEach: function() {
                locale("en");
            },
            afterEach: function() {
                locale("en");
            }
        });

        QUnit.test("getOpenXmlCurrencyFormat", assert => {
            const nonBreakingSpace = "\xa0",
                expectedResults = {
                    RUB: {
                        de: "#,##0{0} RUB",
                        en: "RUB#,##0{0}_);\\(RUB#,##0{0}\\)",
                        ja: "RUB#,##0{0}_);\\(RUB#,##0{0}\\)",
                        ru: "#,##0{0} ₽"
                    },
                    USD: {
                        de: "#,##0{0} $",
                        en: "$#,##0{0}_);\\($#,##0{0}\\)",
                        ja: "$#,##0{0}_);\\($#,##0{0}\\)",
                        ru: "#,##0{0} $"
                    }
                };

            for(const currency in expectedResults) {
                for(const localeId in expectedResults[currency]) {
                    const expected = expectedResults[currency][localeId];

                    locale(localeId);
                    assert.equal(numberLocalization.getOpenXmlCurrencyFormat(currency), expected.replace(" ", nonBreakingSpace));
                }
            }
        });

        QUnit.test("getOpenXmlCurrencyFormat should return default format when currency is undefined", assert => {
            assert.equal(numberLocalization.getOpenXmlCurrencyFormat(undefined), "$#,##0{0}_);\\($#,##0{0}\\)");
        });

        const getIntlDateFormatter = format => {
            return date => {
                return (new Intl.DateTimeFormat(localeId, format))
                    .format(date)
                    .replace(SYMBOLS_TO_REMOVE_REGEX, "")
                    .replace(" at ", ", ");
            };
        };

        QUnit.module("date - " + localeId, {
            beforeEach: function() {
                locale(localeId);
            },
            afterEach: function() {
                locale("en");
            }
        });

        QUnit.test("getMonthNames", assert => {
            const getIntlMonthNames = format => {
                return Array.apply(null, new Array(12)).map((_, monthIndex) => {
                    return getIntlDateFormatter({ month: format })(new Date(0, monthIndex, 2));
                });
            };

            const monthsWide = getIntlMonthNames("long"), monthsAbbr = getIntlMonthNames("short"), monthsNarrow = getIntlMonthNames("narrow");

            assert.deepEqual(dateLocalization.getMonthNames(), monthsWide, "Array of month names without format");
            assert.deepEqual(dateLocalization.getMonthNames("wide"), monthsWide, "Array of month names (wide format)");
            assert.deepEqual(dateLocalization.getMonthNames("abbreviated"), monthsAbbr, "Array of month names (abbreviated format)");
            assert.deepEqual(dateLocalization.getMonthNames("narrow"), monthsNarrow, "Array of month names (narrow format)");
        });

        QUnit.test("getMonthNames non-standalone", assert => {
            const expected = {
                de: "November",
                en: "November",
                ja: "11月",
                ru: "ноября",
                zh: "十一月",
                hr: "studenoga",
                ar: "نوفمبر",
                el: "Νοεμβρίου",
                ca: "novembre"
            };

            assert.equal(dateLocalization.getMonthNames("wide", "format")[10], expected[localeId], "Array of non-standalone month names");
        });

        QUnit.test("getDayNames", assert => {
            const dayNames = {
                en: { long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] }
            };
            const getIntlDayNames = format => {
                const dayNamesByLocale = dayNames[localeId] && dayNames[localeId][format];

                return dayNamesByLocale || Array.apply(null, new Array(7)).map((_, dayIndex) => {
                    return getIntlDateFormatter({ weekday: format, timeZone: "UTC" })(new Date(Date.UTC(0, 0, dayIndex)));
                });
            };

            assert.deepEqual(dateLocalization.getDayNames(),
                getIntlDayNames("long"),
                "Array of day names without format");
            assert.deepEqual(dateLocalization.getDayNames("wide"),
                getIntlDayNames("long"),
                "Array of day names (wide format)");
            assert.deepEqual(dateLocalization.getDayNames("abbreviated"),
                getIntlDayNames("short"),
                "Array of day names (abbreviated format)");
            assert.deepEqual(dateLocalization.getDayNames("short"),
                getIntlDayNames("narrow"),
                "Array of day names (short format)");
            assert.deepEqual(dateLocalization.getDayNames("narrow"),
                getIntlDayNames("narrow"),
                "Array of day names (narrow format)");
        });

        QUnit.test("getTimeSeparator", assert => {
            assert.equal(dateLocalization.getTimeSeparator(), ":");
        });

        QUnit.test("formatUsesMonthName", assert => {
            assert.equal(dateLocalization.formatUsesMonthName("monthAndDay"), true);
            assert.equal(dateLocalization.formatUsesMonthName("monthAndYear"), true);
            assert.equal(dateLocalization.formatUsesMonthName({ month: "long", day: "number", year: "2-digit" }), true);
            assert.equal(dateLocalization.formatUsesMonthName({ month: "short", day: "number", year: "2-digit" }), false);
            assert.equal(dateLocalization.formatUsesMonthName({ month: "narrow", day: "number", year: "2-digit" }), false);
            assert.equal(dateLocalization.formatUsesMonthName({ day: "number", year: "2-digit" }), false);
            assert.equal(dateLocalization.formatUsesMonthName("month"), false);
        });

        QUnit.test("formatUsesDayName", assert => {
            assert.equal(dateLocalization.formatUsesDayName("dayofweek"), true);
            assert.equal(dateLocalization.formatUsesDayName("longdate"), true);
            assert.equal(dateLocalization.formatUsesDayName("longdatelongtime"), true);
            assert.equal(dateLocalization.formatUsesDayName({ weekday: "long", day: "number" }), true);
            assert.equal(dateLocalization.formatUsesDayName({ weekday: "short", day: "number" }), false);
            assert.equal(dateLocalization.formatUsesDayName({ weekday: "narrow", day: "number" }), false);
            assert.equal(dateLocalization.formatUsesDayName("day"), false);
            assert.equal(dateLocalization.formatUsesDayName("shortDate"), false);
        });

        QUnit.test("getFormatParts", assert => {
            assert.deepEqual(dateLocalization.getFormatParts("shortdate").sort(), ["year", "month", "day"].sort());
            assert.deepEqual(dateLocalization.getFormatParts("shorttime").sort(), ["hours", "minutes"].sort());
            assert.deepEqual(dateLocalization.getFormatParts("shortdateshorttime").sort(), ["year", "month", "day", "hours", "minutes"].sort());
        });

        QUnit.test("format", assert => {
            const defaultOptions = Intl.DateTimeFormat(localeId).resolvedOptions();
            const formats = [
                { format: "day", intlFormat: { day: "numeric" } },
                { format: "dayofweek", intlFormat: { weekday: "long" } },
                { format: "hour", expected: localizeDigits("13") },
                { format: "longdate", intlFormat: { weekday: "long", year: "numeric", month: "long", day: "numeric" } },
                { format: "longdatelongtime", intlFormat: { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" } },
                { format: "longtime", intlFormat: { hour: "numeric", minute: "numeric", second: "numeric" } },
                { format: "millisecond", expected: localizeDigits("006") },
                { format: "minute", expected: localizeDigits("04") },
                { format: "month", intlFormat: { month: "long" } },
                { format: "monthandday", intlFormat: { month: "long", day: "numeric" } },
                { format: "monthandyear", intlFormat: { year: "numeric", month: "long" } },
                { format: "shortdate" },
                { format: "shortdateshorttime", intlFormat: { year: defaultOptions.year, month: defaultOptions.month, day: defaultOptions.day, hour: "numeric", minute: "numeric" } },
                { format: "shorttime", intlFormat: { hour: "numeric", minute: "numeric" } },
                { format: "shortyear", intlFormat: { year: "2-digit" } },
                { format: "year", intlFormat: { year: "numeric" } },
            ];

            const quarterData = [
                {
                    date: new Date(2015, 0),
                    expected: "Q1"
                },
                {
                    date: new Date(2015, 1),
                    expected: "Q1"
                },
                {
                    date: new Date(2015, 2),
                    expected: "Q1"
                },
                {
                    date: new Date(2015, 3),
                    expected: "Q2"
                },
                {
                    date: new Date(2015, 4),
                    expected: "Q2"
                },
                {
                    date: new Date(2015, 5),
                    expected: "Q2"
                },
                {
                    date: new Date(2015, 6),
                    expected: "Q3"
                },
                {
                    date: new Date(2015, 7),
                    expected: "Q3"
                },
                {
                    date: new Date(2015, 8),
                    expected: "Q3"
                },
                {
                    date: new Date(2015, 9),
                    expected: "Q4"
                },
                {
                    date: new Date(2015, 10),
                    expected: "Q4"
                },
                {
                    date: new Date(2015, 11),
                    expected: "Q4"
                }
            ];
            const quarterAndYearData = {
                date: new Date(2015, 2, 2, 3, 4, 5, 6),
                expected: "Q1 2015"
            };
            const testDate = new Date(2015, 2, 2, 13, 4, 5, 6);

            const testFormat = (format, date, expected) => {
                assert.equal(dateLocalization.format(date, format), expected, date + " in " + format + " format");
                assert.equal(dateLocalization.format(date, { type: format }), expected, date + " in " + format + " format (object syntax)");
            };

            formats.forEach(data => {
                const expected = data.expected || getIntlDateFormatter(data.intlFormat)(testDate);

                testFormat(data.format, testDate, expected);
                testFormat(data.format.toUpperCase(), testDate, expected);

                if(data.intlFormat) {
                    assert.equal(dateLocalization.format(testDate, data.intlFormat), expected, testDate + " in Intl representation of " + data.format + " format");
                }
            });

            quarterData.forEach(data => {
                testFormat("quarter", data.date, localizeDigits(data.expected));
            });

            testFormat("quarterandyear", quarterAndYearData.date, localizeDigits(quarterAndYearData.expected));

            assert.equal(dateLocalization.format(new Date(2015, 2, 2, 3, 4, 5, 6)), String(new Date(2015, 2, 2, 3, 4, 5)), "without format");
            assert.notOk(dateLocalization.format(), "without date");
        });

        QUnit.test("formatter caching", assert => {
            const originalIntl = window.Intl;
            let count = 0;
            const IntlMock = {
                DateTimeFormat: function() {
                    count++;
                    this.format = () => {
                        return "";
                    };
                }
            };

            try {
                window.Intl = IntlMock;
                dateLocalization.format(new Date(), { day: "numeric", uniqueField: true });
                dateLocalization.format(new Date(), { day: "numeric", uniqueField: true });
                assert.equal(count, 1);
            } finally {
                window.Intl = originalIntl;
            }
        });

        QUnit.test("parse", assert => {
            const currentDate = new Date();
            const testData = [
                { format: "shortDate", date: new Date(2016, 10, 17) },
                { format: "shortDate", date: new Date(2016, 11, 31) },
                { format: "shortDate", date: new Date(2016, 0, 1) },

                { format: "shortTime", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 4, 22) },
                { format: "shortTime", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 18, 56) },
                { format: "shortTime", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0) },
                { format: "shortTime", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 59) },

                { format: "shortDateshortTime", date: new Date(2016, 11, 31, 4, 44) },
                { format: "shortDateshortTime", date: new Date(2016, 11, 31, 12, 32) },
                { format: "shortDateshortTime", date: new Date(2016, 0, 1, 0, 16) },
                { format: "shortDateshortTime", date: new Date(2016, 0, 1, 12, 48) },

                { format: "longtime", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 4, 22, 15) },
                { format: "longtime", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 18, 56, 56) },
                { format: "longtime", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0) },
                { format: "longtime", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 59, 59) },

                { format: "longDate", date: new Date(2016, 10, 17) },
                { format: "longDate", date: new Date(2016, 11, 31) },
                { format: "longDate", date: new Date(2016, 0, 1) },

                { format: "longDateLongTime", date: new Date(2016, 11, 31, 4, 44) },
                { format: "longDateLongTime", date: new Date(2016, 11, 31, 12, 32) },
                { format: "longDateLongTime", date: new Date(2016, 0, 1, 0, 16) },
                { format: "longDateLongTime", date: new Date(2016, 0, 1, 12, 48) },

                { format: "monthAndYear", date: new Date(2016, 9, 1) },
                { format: "monthAndDay", date: new Date(currentDate.getFullYear(), 9, 17) },

                { format: "year", date: new Date(2013, 0, 1) },
                { format: "shortyear", date: new Date(2013, 0, 1) },
                { format: "month", date: new Date(currentDate.getFullYear(), 9, 1) },
                { format: "day", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 17) },
                { format: "hour", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 16) },
                { format: "minute", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentDate.getHours(), 56) }
            ];

            testData.forEach(config => {
                const format = config.format;
                const date = config.date;

                if(localeId.substr(0, 2) === "el" && format === "monthAndYear") {
                    return;
                }

                let formattedDate = dateLocalization.format(date, format);
                let parsedDate = dateLocalization.parse(formattedDate, format);

                assert.equal(parsedDate && parsedDate.toString(), date.toString(), "failed to parse " + formattedDate + " by \"" + format + "\"");

                formattedDate = formattedDate.replace(/(\D)0+(\d)/g, "$1$2");

                parsedDate = dateLocalization.parse(formattedDate, format);
                assert.equal(parsedDate && parsedDate.toString(), date.toString(), "failed to parse " + formattedDate + " by \"" + format + "\" without leading zeroes");
            });
        });

        QUnit.test("parse wrong arguments", assert => {
            assert.equal(dateLocalization.parse(null, "shortDate"), undefined);
            assert.equal(dateLocalization.parse(undefined, "shortDate"), undefined);
            assert.equal(dateLocalization.parse("", "shortDate"), undefined);
        });

        QUnit.test("parse by a function", assert => {
            const expectedDate = new Date(2018, 1, 1);
            const customDateString = "Custom date string";
            const customParser = text => {
                if(text === customDateString) {
                    return expectedDate;
                }
            };
            assert.equal(dateLocalization.parse(customDateString, { parser: customParser }).toString(), expectedDate.toString());
        });

        QUnit.test("DevExtreme format uses default locale options", assert => {
            const date = new Date();

            const intlFormatted = getIntlDateFormatter()(date);
            const dateFormatted = dateLocalization.format(date, "shortdate");
            const dateTimeFormatted = dateLocalization.format(date, "shortdateshorttime");

            assert.equal(dateFormatted, intlFormatted);
            assert.ok(dateTimeFormatted.indexOf(intlFormatted) > -1, dateTimeFormatted + " not contain " + intlFormatted);
        });

        QUnit.test("format/parse by a function", assert => {
            const format = {
                formatter: function(date) {
                    return "It was year " + date.getFullYear() + ".";
                },
                parser: function(text) {
                    return new Date(Number(text.substr(12, 4)), 1, 1);
                }
            };
            const someDate = new Date(1999, 1, 1);

            assert.equal(dateLocalization.format(someDate, format), "It was year 1999.");
            assert.equal(dateLocalization.parse("It was year 2000.", format).getFullYear(), 2000);
        });

        QUnit.test("firstDayOfWeekIndex", assert => {
            const expectedValues = {
                de: 1, en: 0, ja: 0, ru: 1, zh: 0, hr: 1, ar: 6, el: 1, ca: 1
            };
            assert.equal(dateLocalization.firstDayOfWeekIndex(), expectedValues[localeId]);
        });
    });

    QUnit.module("getCurrencySymbol");

    QUnit.test("getCurrencySymbol and config.defaultCurrency", assert => {
        var originalConfig = config();

        try {
            assert.equal(numberLocalization.getCurrencySymbol().symbol, "$");

            config({
                defaultCurrency: "EUR"
            });

            assert.equal(numberLocalization.getCurrencySymbol().symbol, "€");
        } finally {
            config(originalConfig);
        }
    });

    QUnit.module("date - browser specific behavior");

    // NOTE: Workaroud for the MS Edge bug https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/101503/
    QUnit.test("formatted value should not contain &lrm & &rlm symbols", assert => {
        const unwantedSymbols = "\u200E\u200F";
        const originalDateTimeFormatter = Intl.DateTimeFormat;

        try {
            Intl.DateTimeFormat = (locale, config) => {
                return {
                    format: function(date) {
                        return unwantedSymbols + new originalDateTimeFormatter(locale, config).format(date);
                    }
                };
            };

            assert.equal(dateLocalization.format(new Date(2000, 0, 1), { month: "long" }), "January");
            assert.equal(dateLocalization.getMonthNames()[0], "January");
            assert.equal(dateLocalization.getDayNames()[0], "Sunday");
        } finally {
            Intl.DateTimeFormat = originalDateTimeFormatter;
        }
    });

    // Workaroud for the MS Edge and IE bug https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11907541/
    QUnit.test("Format by `hour` and `minute` shortcuts in IE and Edge", assert => {
        const originalDateTimeFormatter = Intl.DateTimeFormat;

        const testData = {
            hour: {
                wrongFormat: { hour: "numeric", hour12: false, minute: "numeric" },
                expected: "01"
            },
            minute: {
                wrongFormat: { year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "numeric", second: "numeric" },
                expected: "02"
            },
        };

        let emulationFormat;
        const wrongBrowserBehaviorEmulator = () => {
            return {
                format: function(date) {
                    return new originalDateTimeFormatter("en", emulationFormat).format(date);
                }
            };
        };

        try {
            Intl.DateTimeFormat = wrongBrowserBehaviorEmulator;

            for(const format in testData) {
                emulationFormat = testData[format].wrongFormat;
                assert.equal(dateLocalization.format(new Date(2000, 0, 1, 1, 2), format), testData[format].expected, "Format: " + format);

            }
        } finally {
            Intl.DateTimeFormat = originalDateTimeFormatter;
        }
    });

});
