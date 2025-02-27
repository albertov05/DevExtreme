import "common.css!";
import "generic_light.css!";
import "ui/scheduler/ui.scheduler.subscribes";
import "ui/scheduler/ui.scheduler";

import $ from "jquery";
import { noop } from "core/utils/common";
import fx from "animation/fx";
import recurrenceUtils from "ui/scheduler/utils.recurrence";
import dateUtils from "core/utils/date";
import config from "core/config";

import { SchedulerTestWrapper } from './helpers.js';

function getTimezoneDifference(date, timeZone) {
    return date.getTimezoneOffset() * dateUtils.dateToMilliseconds("minute") + timeZone * dateUtils.dateToMilliseconds("hour");
}

QUnit.testStart(function() {
    $("#qunit-fixture").html('<div id="scheduler"></div>');
});

QUnit.module("Subscribes", {
    beforeEach: function() {
        this.clock = sinon.useFakeTimers();
        this.createInstance = function(options) {
            this.instance = $("#scheduler").dxScheduler(options).dxScheduler("instance");
        };
        fx.off = true;
    },
    afterEach: function() {
        fx.off = false;
        this.clock.restore();
    }
});

QUnit.test("'fixWrongEndDate' should process endDate correctly", function(assert) {
    this.createInstance({
        currentView: "week"
    });

    var checkedDate = this.instance.fire("fixWrongEndDate",
        {
            startDate: new Date(2019, 4, 3, 12),
            allDay: false
        }, new Date(2019, 4, 3, 12), undefined);

    assert.equal(checkedDate.getTime(), new Date(2019, 4, 3, 12, 30).getTime(), "checked date is ok when endDate is undefined");

    checkedDate = this.instance.fire("fixWrongEndDate",
        {
            startDate: new Date(2019, 4, 3, 12),
            allDay: false
        }, new Date(2019, 4, 3, 12), new Date("string"));

    assert.equal(checkedDate.getTime(), new Date(2019, 4, 3, 12, 30).getTime(), "checked date is ok when endDate is invalid");

    checkedDate = this.instance.fire("fixWrongEndDate",
        {
            startDate: new Date(2019, 4, 3, 12),
            allDay: true
        }, new Date(2019, 4, 3, 12), undefined);

    assert.equal(checkedDate.getHours(), 23, "checked date is ok when endDate is undefined, allDay appointment");
    assert.equal(checkedDate.getMinutes(), 59, "checked date is ok when endDate is undefined, allDay appointment");
});

QUnit.test("'getTargetedAppointmentData' should return correct data for recurrence appointments (T660901)", function(assert) {
    var appointmentData = {
        startDate: new Date(2015, 1, 1, 5, 11),
        endDate: new Date(2015, 1, 1, 6),
        recurrenceRule: "FREQ=HOURLY;INTERVAL=2"
    };
    this.createInstance({
        currentDate: new Date(2015, 1, 1),
        currentView: "day",
        dataSource: [appointmentData]
    });

    var $appointments = this.instance.$element().find(".dx-scheduler-appointment");
    var targetedData = this.instance.fire("getTargetedAppointmentData", appointmentData, $appointments.eq(1));

    assert.equal(targetedData.startDate.getTime(), appointmentData.startDate.getTime() + 2 * 3600000, "Targeted startDate is OK");
    assert.equal(targetedData.endDate.getTime(), appointmentData.endDate.getTime() + 2 * 3600000, "Targeted endDate is OK");
});

QUnit.test("'setCellDataCacheAlias' should call workSpace method with right arguments", function(assert) {
    this.createInstance({
        currentView: "week"
    });

    var setCacheAliasStub = sinon.stub(this.instance.getWorkSpace(), "setCellDataCacheAlias");
    try {
        this.instance.fire("setCellDataCacheAlias", {
            rowIndex: 1,
            cellIndex: 2,
            groupIndex: 3,
            left: 4,
            top: 5
        }, {
            left: 4,
            top: 5
        });

        assert.ok(setCacheAliasStub.calledOnce, "setCellDataCacheAlias workSpace method called once");
        assert.deepEqual(setCacheAliasStub.getCall(0).args[0], {
            rowIndex: 1,
            cellIndex: 2,
            groupIndex: 3,
            left: 4,
            top: 5
        }, "setCellDataCacheAlias workSpace method called with correct appointmentSettings");
        assert.deepEqual(setCacheAliasStub.getCall(0).args[1], {
            left: 4,
            top: 5
        }, "setCellDataCacheAlias workSpace method called with correct geometry");
    } finally {
        setCacheAliasStub.restore();
    }
});

QUnit.test("'getDraggableAppointmentArea' should return workSpace date table scrollable", function(assert) {
    this.createInstance();
    var draggableArea;

    this.instance.fire("getDraggableAppointmentArea", {
        callback: function(result) {
            draggableArea = result;
        }
    });

    assert.deepEqual(draggableArea.get(0), this.instance.$element().find(".dx-scheduler-date-table-scrollable .dx-scrollable-container").get(0), "Draggable area is OK");
});

QUnit.test("'needCoordinates' should return workSpace date table scrollable", function(assert) {
    this.createInstance({
        currentView: "day",
        startDayHour: 2,
        endDayHour: 10,
        currentDate: 1425416400000
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            "startDate": new Date(2015, 2, 3, 22),
            "endDate": new Date(2015, 2, 17, 10, 30)
        },
        startDate: new Date(2015, 2, 3, 22),
        callback: function(result) {
            var coordinate = result[0];
            assert.roughEqual(coordinate.top, 0, 1.001, "Top coordinate is OK");
        }
    });
});

QUnit.test("'needRecalculateResizableArea' should return false for horizontal grouped workspace", function(assert) {
    this.createInstance({
        currentView: "workWeek",
        views: [{
            type: "workWeek",
            groupOrientation: "horizontal"
        }],
        height: 500,
        groups: ["priorityId"],
        resources: [{
            field: "typeId",
            dataSource: [{ id: 1, color: "red" }]
        },
        {
            field: "priorityId",
            dataSource: [{ id: 1, color: "black" }]
        }
        ]
    });

    var scrollable = this.instance.getWorkSpace().getScrollable();
    scrollable.scrollTo({ left: 0, top: 400 });

    var needRecalculate = this.instance.fire("needRecalculateResizableArea");

    assert.notOk(needRecalculate, "Resizable area should not be recalculated");
});

QUnit.test("'needRecalculateResizableArea' should return true for vertical grouped workspace", function(assert) {
    this.createInstance({
        currentView: "workWeek",
        views: [{
            type: "workWeek",
            groupOrientation: "vertical"
        }],
        height: 500,
        groups: ["priorityId"],
        resources: [{
            field: "typeId",
            dataSource: [{ id: 1, color: "red" }]
        },
        {
            field: "priorityId",
            dataSource: [{ id: 1, color: "black" }]
        }
        ]
    });

    var scrollable = this.instance.getWorkSpace().getScrollable();
    scrollable.scrollTo({ left: 0, top: 400 });

    var needRecalculate = this.instance.fire("needRecalculateResizableArea");

    assert.ok(needRecalculate, "Resizable area should be recalculated");
});

QUnit.test("'needCoordinates' should return correct count of coordinates for allDay recurrence appointment", function(assert) {
    this.createInstance();
    this.instance.option({
        currentView: "week",
        startDayHour: 2,
        endDayHour: 10,
        currentDate: new Date(2015, 2, 2, 0),
        firstDayOfWeek: 1
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            "startDate": new Date(2015, 2, 2, 0),
            "endDate": new Date(2015, 2, 3, 0),
            "recurrenceRule": "FREQ=DAILY"
        },
        startDate: new Date(2015, 2, 2, 0),
        callback: function(result) {
            assert.equal(result.length, 7, "count is OK");
        }
    });
});

QUnit.test("'needCoordinates' should return correct count of coordinates for allDay recurrence appointment, allDay = true", function(assert) {
    this.createInstance();
    this.instance.option({
        currentView: "week",
        startDayHour: 2,
        endDayHour: 10,
        currentDate: new Date(2015, 2, 2, 0),
        firstDayOfWeek: 1
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            "startDate": new Date(2015, 2, 2, 0),
            "endDate": new Date(2015, 2, 3, 0),
            "recurrenceRule": "FREQ=DAILY",
            allDay: true
        },
        startDate: new Date(2015, 2, 2, 0),
        callback: function(result) {
            assert.equal(result.length, 7, "count is OK");
        }
    });
});

QUnit.test("'needCoordinates' should not change dateRange", function(assert) {
    this.createInstance({
        currentView: "week",
        startDayHour: 2,
        endDayHour: 10,
        currentDate: new Date(2015, 2, 2, 0),
        firstDayOfWeek: 1
    });

    var instance = this.instance,
        dateRange = instance._workSpace.getDateRange();

    instance.fire("needCoordinates", {
        appointmentData: {
            "startDate": new Date(2015, 2, 2, 0),
            "endDate": new Date(2015, 2, 3, 0),
            "recurrenceRule": "FREQ=DAILY",
            allDay: true
        },
        startDate: new Date(2015, 2, 2, 0),
        callback: function(result) {
            assert.deepEqual(dateRange, instance._workSpace.getDateRange(), "Date range wasn't changed");
        }
    });
});

QUnit.test("'needCoordinates' should calculate correct dates fo recurring appts (T408509)", function(assert) {
    this.createInstance({
        currentView: "week",
        startDayHour: 2,
        endDayHour: 10,
        currentDate: new Date(2015, 2, 2, 0),
        firstDayOfWeek: 1
    });
    var getDatesByRecurrenceStub = sinon.stub(recurrenceUtils, "getDatesByRecurrence").returns([]);

    try {
        var instance = this.instance;


        instance.fire("needCoordinates", {
            appointmentData: {
                "startDate": new Date(2015, 2, 2, 0),
                "endDate": new Date(2015, 2, 3, 0),
                "recurrenceRule": "FREQ=DAILY",
                allDay: true
            },
            startDate: new Date(2015, 2, 2, 0),
            originalStartDate: new Date(2015, 2, 2, 1),
            callback: noop
        });

        var startDate = getDatesByRecurrenceStub.getCall(0).args[0].start;

        assert.equal(startDate.getTime(), new Date(2015, 2, 2, 1).getTime(), "Original start date was used for dates calculation");

    } finally {
        getDatesByRecurrenceStub.restore();
    }
});

QUnit.test("Long appointment in Timeline view should have right left coordinate", function(assert) {
    this.createInstance({
        currentView: "timelineDay",
        views: ["timelineDay"],
        currentDate: new Date(2015, 2, 3)
    });

    var $expectedCell = this.instance.$element().find(".dx-scheduler-date-table-cell").eq(1),
        expectedLeftCoordinate = $expectedCell.position().left;

    this.instance.fire("needCoordinates", {
        appointmentData: {
            "startDate": new Date(2015, 2, 3, 0, 30),
            "endDate": new Date(2015, 2, 5, 15, 30)
        },
        startDate: new Date(2015, 2, 3, 0, 30),
        callback: function(result) {
            var coordinate = result[0];
            assert.equal(coordinate.left, expectedLeftCoordinate, "left coordinate is OK");
        }
    });
});

QUnit.test("'needCoordinates' should work correct with custom data fields", function(assert) {
    this.createInstance({
        currentView: "week",
        currentDate: new Date(2015, 2, 2, 0),
        firstDayOfWeek: 1,
        startDateExpr: "Start"
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2015, 2, 2, 0)
        },
        startDate: new Date(2015, 2, 2, 0),
        callback: function(result) {
            assert.equal(result.length, 1, "Coordinates are OK");
        }
    });
});

QUnit.test("'updateAppointmentStartDate' should work correct with custom data fields", function(assert) {
    this.createInstance({
        startDateExpr: "Start"
    });

    this.instance.fire("updateAppointmentStartDate", {
        startDate: new Date(2015, 2, 2, 0),
        callback: function(result) {
            assert.ok(result, "There is some result");
        }
    });
});

QUnit.test("'mapAppointmentFields' should call getTargetedAppointmentData", function(assert) {
    this.createInstance();

    var stub = sinon.stub(this.instance._subscribes, "getTargetedAppointmentData");

    this.instance.fire("mapAppointmentFields", {
        itemData: {
            startDate: new Date(2015, 1, 1),
            endDate: new Date(2015, 1, 1, 1),
            allDay: true
        }
    });

    var appointmentData = stub.getCall(0).args[0];

    assert.deepEqual(appointmentData, {
        startDate: new Date(2015, 1, 1),
        endDate: new Date(2015, 1, 1, 1),
        allDay: true
    }, "Appointment data is OK");
});

QUnit.test("'formatDates' should work correct with custom data fields", function(assert) {
    this.createInstance({
        startDateExpr: "Start",
        endDateExpr: "End"
    });

    this.instance.fire("formatDates", {
        startDate: new Date(2015, 2, 2, 0),
        endDate: new Date(2015, 2, 2, 30),
        formatType: "DATETIME",
        callback: function(result) {
            assert.ok(result, "There is some result");
        }
    });
});

QUnit.test("'appointmentTakesAllDay' should work correct with custom data fields", function(assert) {
    this.createInstance({
        startDateExpr: "Start",
        endDateExpr: "End",
    });

    this.instance.fire("appointmentTakesAllDay", {
        appointment: {
            Start: new Date(2015, 2, 2, 0),
            End: new Date(2015, 2, 3, 0)
        },
        callback: function(result) {
            assert.ok(result, "There is some result");
        }
    });
});

QUnit.test("'showAddAppointmentPopup' should update appointment data if there is some custom data fields", function(assert) {
    this.createInstance();
    var stub = sinon.stub(this.instance, "showAppointmentPopup");

    this.instance.option({
        startDateExpr: "Start",
        endDateExpr: "End",
        allDayExpr: "AllDay"
    });

    this.instance.fire("showAddAppointmentPopup", {
        startDate: new Date(2015, 1, 1),
        endDate: new Date(2015, 1, 1, 1),
        allDay: true
    });

    var appointmentData = stub.getCall(0).args[0];

    assert.deepEqual(appointmentData, {
        Start: new Date(2015, 1, 1),
        End: new Date(2015, 1, 1, 1),
        AllDay: true
    }, "Appointment data is OK");
});

QUnit.test("'resizePopup' should trigger dxresize event for appointment popup", function(assert) {
    var resizeHandler = sinon.spy();

    this.createInstance({
        currentDate: new Date(2015, 1, 1),
        currentView: "day",
        dataSource: []
    });

    this.instance.fire("showAddAppointmentPopup", {
        startDate: new Date(2015, 1, 1),
        endDate: new Date(2015, 1, 1, 1),
        allDay: true
    });

    $(this.instance._popup.$element()).on("dxresize", resizeHandler);
    this.instance.fire("resizePopup");

    assert.ok(resizeHandler.called, "event has been triggered");
});

QUnit.test("'appointmentFocused' should fire restoreScrollTop", function(assert) {
    this.createInstance();

    var workspace = this.instance.$element().find(".dx-scheduler-work-space").dxSchedulerWorkSpaceDay("instance"),
        restoreScrollTopStub = sinon.stub(workspace, "restoreScrollTop");

    this.instance.fire("appointmentFocused");

    assert.ok(restoreScrollTopStub.calledOnce, "There is some result");
});

QUnit.test("check the 'getField' method with date field", function(assert) {
    var defaultForceIsoDateParsing = config().forceIsoDateParsing;
    config().forceIsoDateParsing = true;
    try {
        this.createInstance();
        var startDate = this.instance.fire("getField", "startDate", { startDate: "2017-02-08" });
        assert.deepEqual(startDate, new Date(2017, 1, 8), "the 'getField' method works fine");

        var endDate = this.instance.fire("getField", "endDate", { endDate: "2017-02-09" });
        assert.deepEqual(endDate, new Date(2017, 1, 9), "the 'getField' method works fine");
    } finally {
        config().forceIsoDateParsing = defaultForceIsoDateParsing;
    }
});

QUnit.test("check the 'setField' method with date field and auto detect of serialization format", function(assert) {
    var defaultForceIsoDateParsing = config().forceIsoDateParsing;
    config().forceIsoDateParsing = true;
    try {
        this.createInstance();
        var obj = { startDate: "2017-02-07", endDate: "2017-02-08" };

        this.instance.fire("getField", "startDate", obj);

        this.instance.fire("setField", "startDate", obj, new Date(2017, 1, 8));
        assert.equal(obj.startDate, "2017-02-08", "the 'setField' method works fine");

        this.instance.fire("setField", "endDate", obj, new Date(2017, 1, 10));
        assert.equal(obj.endDate, "2017-02-10", "the 'setField' method works fine");
    } finally {
        config().forceIsoDateParsing = defaultForceIsoDateParsing;
    }
});

QUnit.test("prevent unexpected dateSerializationFormat option changing", function(assert) {
    var defaultForceIsoDateParsing = config().forceIsoDateParsing;
    config().forceIsoDateParsing = true;
    try {
        this.createInstance();
        var obj = { startDate: new Date(2017, 2, 7) };

        assert.strictEqual(this.instance.option("dateSerializationFormat"), undefined);
        this.instance.fire("getField", "startDate", obj);

        assert.strictEqual(this.instance.option("dateSerializationFormat"), undefined);
    } finally {
        config().forceIsoDateParsing = defaultForceIsoDateParsing;
    }
});

QUnit.test("check the 'setField' method with date field and dateSerializationFormat", function(assert) {
    this.createInstance({
        dateSerializationFormat: "yyyy-MM-ddTHH:mm:ssZ"
    });
    var obj = { startDate: "2017-02-07", endDate: "2017-02-08" };

    this.instance.fire("setField", "startDate", obj, new Date(Date.UTC(2017, 1, 8, 1)));
    assert.equal(obj.startDate, "2017-02-08T01:00:00Z", "the 'setField' method works fine");

    this.instance.fire("setField", "endDate", obj, new Date(Date.UTC(2017, 1, 10, 1)));
    assert.equal(obj.endDate, "2017-02-10T01:00:00Z", "the 'setField' method works fine");
});

QUnit.test("check the 'getField' method", function(assert) {
    this.createInstance();
    var text = this.instance.fire("getField", "text", { text: 1 });
    assert.equal(text, 1, "the 'getField' method works fine");
});

QUnit.test("check the 'getField - recurrenceRule' method, if recurrenceRuleExpr = null", function(assert) {
    this.createInstance({
        recurrenceRuleExpr: null
    });

    var recurrenceRule = this.instance.fire("getField", "recurrenceRule", { recurrenceRule: "FREQ=daily" });
    assert.strictEqual(recurrenceRule, undefined, "the 'getField' method works fine");
});

QUnit.test("check the 'getField - recurrenceRule' method, if recurrenceRuleExpr was set as null after option changed", function(assert) {
    this.createInstance();

    this.instance.option({
        recurrenceRuleExpr: null
    });

    var recurrenceRule = this.instance.fire("getField", "recurrenceRule", { recurrenceRule: "FREQ=daily" });
    assert.strictEqual(recurrenceRule, undefined, "the 'getField' method works fine");
});

QUnit.test("check the 'getField - recurrenceRule' method, if recurrenceRuleExpr was set as value after option changed", function(assert) {
    this.createInstance({
        recurrenceRuleExpr: null
    });

    this.instance.option({
        recurrenceRuleExpr: "recurrenceRule"
    });

    var recurrenceRule = this.instance.fire("getField", "recurrenceRule", { recurrenceRule: "FREQ=daily" });
    assert.equal(recurrenceRule, "FREQ=daily", "the 'getField' method works fine");
});

QUnit.test("check the 'setField' method", function(assert) {
    this.createInstance();
    var obj = { text: 1 };

    this.instance.fire("setField", "text", obj, 2);
    assert.equal(obj.text, 2, "the 'setField' method works fine");
});

QUnit.test("check the 'setField' method with multi-dotted string", function(assert) {
    this.createInstance({ textExpr: "a.b.text" });
    var obj = this.instance.fire("setField", "text", {}, 2),
        obj1 = this.instance.fire("setField", "text", { c: "just field" }, 2);

    assert.deepEqual(obj, { a: { b: { text: 2 } } }, "the 'setField' method works fine");
    assert.deepEqual(obj1, { c: "just field", a: { b: { text: 2 } } }, "the 'setField' method works fine");
});

QUnit.test("check the 'setField-recurrenceRule' method, if recurrenceRuleExpr = null", function(assert) {
    this.createInstance({
        recurrenceRuleExpr: null
    });

    var obj = { recurrenceRule: "FREQ=DAILY" };

    this.instance.fire("setField", "recurrenceRule", obj, "FREQ=WEEKLY");
    assert.equal(obj.recurrenceRule, "FREQ=DAILY", "the 'setField' method works fine");
});

QUnit.test("check the 'setField-recurrenceRule' method, if recurrenceRuleExpr was set as null after option changed", function(assert) {
    this.createInstance();

    this.instance.option({
        recurrenceRuleExpr: null
    });

    var obj = { recurrenceRule: "FREQ=DAILY" };

    this.instance.fire("setField", "recurrenceRule", obj, "FREQ=WEEKLY");
    assert.equal(obj.recurrenceRule, "FREQ=DAILY", "the 'setField' method works fine");
});

QUnit.test("check the 'setField-recurrenceRule' method, if recurrenceRuleExpr was set as value after option changed", function(assert) {
    this.createInstance({
        recurrenceRuleExpr: null
    });

    this.instance.option({
        recurrenceRuleExpr: "recurrenceRule"
    });

    var obj = { recurrenceRule: "FREQ=DAILY" };

    this.instance.fire("setField", "recurrenceRule", obj, "FREQ=WEEKLY");
    assert.equal(obj.recurrenceRule, "FREQ=WEEKLY", "the 'setField' method works fine");
});

QUnit.test("UpdateAppointmentStartDate should return corrected startDate", function(assert) {
    this.createInstance();
    this.instance.option({
        currentView: "week",
        currentDate: new Date(2016, 1, 1),
        startDayHour: 5
    });

    var appointment = {
        startDate: new Date(2016, 1, 2, 2),
        endDate: new Date(2016, 1, 2, 7)
    };

    this.instance.fire("updateAppointmentStartDate", {
        startDate: appointment.startDate,
        callback: function(result) {
            assert.deepEqual(result, new Date(2016, 1, 2, 5), "Updated date is correct");
        }
    });
});

QUnit.test("UpdateAppointmentStartDate should return corrected startDate when appointment is short", function(assert) {
    this.createInstance();
    this.instance.option({
        currentView: "week",
        currentDate: new Date(2016, 1, 1),
        startDayHour: 9
    });

    var appointment = {
        startDate: new Date(2016, 1, 2, 8, 30),
        endDate: new Date(2016, 1, 2, 9, 1)
    };

    this.instance.fire("updateAppointmentStartDate", {
        startDate: appointment.startDate,
        callback: function(result) {
            assert.deepEqual(result, new Date(2016, 1, 2, 9, 0), "Updated date is correct");
        }
    });
});

QUnit.test("appointmentTakesSeveralDays should return true, if startDate and endDate is different days", function(assert) {
    this.createInstance();
    this.instance.option({
        currentView: "week",
        currentDate: new Date(2016, 1, 1),
    });

    var appointments = [
        {
            startDate: new Date(2016, 1, 2, 2),
            endDate: new Date(2016, 1, 3, 7)
        },
        {
            startDate: new Date(2016, 1, 2, 2),
            endDate: new Date(2016, 1, 2, 7)
        },
    ];

    assert.ok(this.instance.fire("appointmentTakesSeveralDays", appointments[0]), "appointmentTakesSeveralDays works correctly");
    assert.notOk(this.instance.fire("appointmentTakesSeveralDays", appointments[1]), "appointmentTakesSeveralDays works correctly");
});

QUnit.test("UpdateAppointmentStartDate should return corrected startDate for long appointments", function(assert) {
    this.createInstance();

    this.instance.option({
        currentView: "week",
        currentDate: new Date(2016, 1, 1),
        startDayHour: 5
    });

    var appointment = {
        startDate: new Date(2016, 1, 2, 2),
        endDate: new Date(2016, 1, 4, 7)
    };

    this.instance.fire("updateAppointmentStartDate", {
        startDate: appointment.startDate,
        appointment: appointment,
        callback: function(result) {
            assert.deepEqual(result, new Date(2016, 1, 2, 5), "Date is correct");
        }
    });
});

QUnit.test("UpdateAppointmentEndDate should return corrected endDate", function(assert) {
    this.createInstance();
    this.instance.option({
        currentView: "timelineWeek",
        currentDate: 1425416400000,
        startDayHour: 1,
        endDayHour: 10
    });

    var appointment = {
        startDate: new Date(2015, 2, 3, 9, 30),
        endDate: new Date(2015, 2, 3, 10, 30)
    };

    this.instance.fire("updateAppointmentEndDate", {
        appointment: appointment,
        endDate: appointment.endDate,
        callback: function(result) {
            assert.deepEqual(result, new Date(2015, 2, 3, 10), "Updated date is correct");
        }
    });
});

QUnit.test("UpdateAppointmentEndDate should return corrected endDate for long appointment", function(assert) {
    this.createInstance();
    this.instance.option({
        currentView: "timelineWeek",
        currentDate: 1425416400000,
        startDayHour: 1,
        endDayHour: 10
    });

    var appointment = {
        startDate: new Date(2015, 2, 2, 9, 30),
        endDate: new Date(2015, 2, 3, 10, 30)
    };

    this.instance.fire("updateAppointmentEndDate", {
        appointment: appointment,
        endDate: appointment.endDate,
        callback: function(result) {
            assert.deepEqual(result, new Date(2015, 2, 3, 10), "Updated date is correct");
        }
    });
});

QUnit.test("UpdateAppointmentEndDate should return corrected endDate by certain endDayHour", function(assert) {
    this.createInstance({
        currentView: "timelineWeek",
        views: [{
            type: "timelineWeek",
            endDayHour: 18
        }],
        startDayHour: 9,
        endDayHour: 23,
        currentDate: new Date(2015, 2, 3)
    });

    var appointment = {
        startDate: new Date(2015, 2, 3, 9, 30),
        endDate: new Date(2015, 2, 3, 20, 30)
    };

    this.instance.fire("updateAppointmentEndDate", {
        appointment: appointment,
        endDate: appointment.endDate,
        callback: function(result) {
            assert.deepEqual(result, new Date(2015, 2, 3, 18), "Updated date is correct");
        }
    });
});

QUnit.test("'convertDateByTimezone' should return date according to the custom timeZone", function(assert) {
    var timezoneValue = 5;
    this.createInstance();
    this.instance.option({
        timeZone: timezoneValue
    });

    var date = new Date(2015, 6, 3, 3),
        timezoneDifference = getTimezoneDifference(date, timezoneValue);

    var convertedDate = this.instance.fire("convertDateByTimezone", date);

    assert.deepEqual(convertedDate, new Date(date.getTime() + timezoneDifference), "'convertDateByTimezone' works fine");
});

QUnit.test("'convertDateByTimezone' should return date according to the custom timeZone as string", function(assert) {
    var timezone = { id: "Asia/Ashkhabad", value: 5 };
    this.createInstance();

    this.instance.option({
        timeZone: timezone.id
    });

    var date = new Date(2015, 6, 3, 3),
        timezoneDifference = getTimezoneDifference(date, timezone.value);

    var convertedDate = this.instance.fire("convertDateByTimezone", date);

    assert.deepEqual(convertedDate, new Date(date.getTime() + timezoneDifference), "'convertDateByTimezone' works fine");
});

QUnit.test("'convertDateByTimezone' should return date according to the custom timeZone with non-integer number", function(assert) {
    var timezone = { id: "Australia/Broken_Hill", value: 9.5 };
    this.createInstance();

    this.instance.option({
        timeZone: timezone.id
    });

    var date = new Date(2015, 6, 3, 3),
        timezoneDifference = getTimezoneDifference(date, timezone.value);

    var convertedDate = this.instance.fire("convertDateByTimezone", date);

    assert.deepEqual(convertedDate, new Date(date.getTime() + timezoneDifference), "'convertDateByTimezone' works fine");
});

QUnit.test("'getAppointmentDurationInMs' should return visible appointment duration", function(assert) {
    this.createInstance();

    this.instance.fire("getAppointmentDurationInMs", {
        startDate: new Date(2015, 2, 2, 8),
        endDate: new Date(2015, 2, 2, 20),
        callback: function(result) {
            assert.equal(result / dateUtils.dateToMilliseconds("hour"), 12, "'getAppointmentDurationInMs' works fine");
        }
    });
});

QUnit.test("'getAppointmentDurationInMs' should return visible appointment duration considering startDayHour and endDayHour", function(assert) {
    this.createInstance();

    this.instance.option({
        startDayHour: 8,
        endDayHour: 20
    });

    this.instance.fire("getAppointmentDurationInMs", {
        startDate: new Date(2015, 2, 2, 8),
        endDate: new Date(2015, 2, 4, 20),
        callback: function(result) {
            assert.equal(result / dateUtils.dateToMilliseconds("hour"), 12 * 3, "'getAppointmentDurationInMs' works fine");
        }
    });
});

QUnit.test("'getAppointmentDurationInMs' should return visible appointment duration considering startDayHour and endDayHour for stricly allDay appointment without allDay field", function(assert) {
    this.createInstance();

    this.instance.option({
        startDayHour: 8,
        endDayHour: 20
    });

    this.instance.fire("getAppointmentDurationInMs", {
        startDate: new Date(2015, 2, 2, 8),
        endDate: new Date(2015, 2, 3, 0),
        callback: function(result) {
            assert.equal(result / dateUtils.dateToMilliseconds("hour"), 12, "'getAppointmentDurationInMs' works fine");
        }
    });
});

QUnit.test("'getAppointmentDurationInMs' should return visible appointment duration considering hours of startDate and endDate", function(assert) {
    this.createInstance();

    this.instance.option({
        startDayHour: 1,
        endDayHour: 22
    });

    this.instance.fire("getAppointmentDurationInMs", {
        startDate: new Date(2015, 4, 25, 21),
        endDate: new Date(2015, 4, 26, 3),
        callback: function(result) {
            assert.equal(result / dateUtils.dateToMilliseconds("hour"), 3, "'getAppointmentDurationInMs' works fine");
        }
    });
});

QUnit.test("'getAppointmentDurationInMs' should return visible long appointment duration considering hours of startDate and endDate", function(assert) {
    this.createInstance();

    this.instance.option({
        startDayHour: 8,
        endDayHour: 20
    });

    this.instance.fire("getAppointmentDurationInMs", {
        startDate: new Date(2015, 2, 2, 10),
        endDate: new Date(2015, 2, 4, 17),
        callback: function(result) {
            assert.equal(result / dateUtils.dateToMilliseconds("hour"), 31, "'getAppointmentDurationInMs' works fine");
        }
    });
});

QUnit.test("'getAppointmentDurationInMs' should return visible appointment duration considering hours of ultraboundary startDate and endDate", function(assert) {
    this.createInstance();

    this.instance.option({
        startDayHour: 8,
        endDayHour: 20
    });

    this.instance.fire("getAppointmentDurationInMs", {
        startDate: new Date(2015, 2, 2, 7),
        endDate: new Date(2015, 2, 4, 21),
        callback: function(result) {
            assert.equal(result / dateUtils.dateToMilliseconds("hour"), 12 * 3, "'getAppointmentDurationInMs' works fine");
        }
    });
});

QUnit.test("'getAppointmentDurationInMs' should return visible allDay appointment duration", function(assert) {
    this.createInstance();

    this.instance.option({
        startDayHour: 8,
        endDayHour: 20
    });

    this.instance.fire("getAppointmentDurationInMs", {
        startDate: new Date(2015, 2, 2, 7),
        endDate: new Date(2015, 2, 4, 21),
        allDay: true,
        callback: function(result) {
            assert.equal(result / dateUtils.dateToMilliseconds("hour"), 12 * 3, "'getAppointmentDurationInMs' works fine");
        }
    });
});

QUnit.test("'getAppointmentDurationInMs' should return visible appointment duration if last cell has small duration (T664073)", function(assert) {
    this.createInstance();

    this.instance.option({
        startDayHour: 8,
        currentView: "timelineDay",
        cellDuration: 61
    });

    this.instance.fire("getAppointmentDurationInMs", {
        startDate: new Date(2015, 2, 2, 7),
        endDate: new Date(2015, 2, 4, 21),
        allDay: true,
        callback: function(result) {
            assert.equal(result / dateUtils.dateToMilliseconds("hour"), 48.8, "'getAppointmentDurationInMs' works fine");
        }
    });
});

QUnit.test("'getAppointmentColor' by certain group", function(assert) {
    var appointmentColor;

    this.createInstance({
        currentView: "workWeek",
        views: ["week", {
            type: "workWeek",
            groups: ["typeId"]
        }],
        groups: ["priorityId"],
        resources: [{
            field: "typeId",
            dataSource: [{ id: 1, color: "red" }]
        },
        {
            field: "priorityId",
            dataSource: [{ id: 1, color: "black" }]
        }
        ]
    });

    this.instance.fire("getAppointmentColor", {
        itemData: {
            typeId: 1,
            priorityId: 1
        },
        groupIndex: 0,
        callback: function(result) {
            result.done(function(color) {
                appointmentColor = color;
            });
        }
    });

    assert.strictEqual(appointmentColor, "red", "appointment color");
});

QUnit.test("'getAppointmentColor' with fieldExpr for complex resource", function(assert) {
    var appointmentColor;

    this.createInstance({
        currentView: "workWeek",
        views: ["week", {
            type: "workWeek",
            groups: ["typeId"]
        }],
        groups: ["TheatreId"],
        resources: [{
            fieldExpr: "Movie.ID",
            useColorAsDefault: true,
            allowMultiple: false,
            dataSource: [{
                "ID": 1,
                "Color": "blue"
            }, {
                "ID": 3,
                "Color": "red"
            }],
            valueExpr: "ID",
            colorExpr: "Color"
        }, {
            fieldExpr: "TheatreId",
            dataSource: [{
                id: 1
            }, {
                id: 2
            }]
        }]
    });

    this.instance.fire("getAppointmentColor", {
        itemData: {
            "Price": 10,
            "startDate": new Date(2015, 4, 24, 9, 10, 0, 0),
            "endDate": new Date(2015, 4, 24, 11, 1, 0, 0),
            "Movie": {
                "ID": 3
            },
            "TheatreId": 1
        },
        groupIndex: 0,
        callback: function(result) {
            result.done(function(color) {
                appointmentColor = color;
            });
        }
    });

    assert.strictEqual(appointmentColor, "red", "appointment color is OK");
});

QUnit.test("'getHeaderHeight' should return correct value", function(assert) {
    this.createInstance({
        views: ["day"],
        currentView: "day",
        dataSource: [{ startDate: new Date(2016, 2, 1, 1), endDate: new Date(2016, 2, 1, 2) }]
    });

    var headerHeight = this.instance.fire("getHeaderHeight");

    assert.equal(headerHeight, 56, "Header height is OK");
});

QUnit.test("'getMaxAppointmentsPerCell' should return correct value in accordance with scheduler configuration", function(assert) {
    this.createInstance({
        views: [{
            name: "DAY",
            type: "day",
            maxAppointmentsPerCell: 5
        }, {
            name: "WEEK",
            type: "week"
        }],
        currentView: "DAY",
        dataSource: [{ startDate: new Date(2016, 2, 1, 1), endDate: new Date(2016, 2, 1, 2) }]
    });

    var countPerCell = this.instance.fire("getMaxAppointmentsPerCell");

    assert.equal(countPerCell, 5, "overlappingMode is OK");

    this.instance.option("currentView", "WEEK");

    countPerCell = this.instance.fire("getMaxAppointmentsPerCell");

    assert.equal(countPerCell, "auto", "overlappingMode is OK");
});

QUnit.test("'getMaxAppointmentsPerCell' should return correct value in accordance with view configuration", function(assert) {
    this.createInstance({
        views: [{
            name: "DAY",
            type: "day",
            maxAppointmentsPerCell: 5
        }, {
            name: "WEEK",
            type: "week",
            maxAppointmentsPerCell: "unlimited"
        }],
        currentView: "DAY",
        dataSource: [{ startDate: new Date(2016, 2, 1, 1), endDate: new Date(2016, 2, 1, 2) }]
    });

    var countPerCell = this.instance.fire("getMaxAppointmentsPerCell");

    assert.equal(countPerCell, 5, "overlappingMode is OK");

    this.instance.option("currentView", "WEEK");

    countPerCell = this.instance.fire("getMaxAppointmentsPerCell");

    assert.equal(countPerCell, "unlimited", "overlappingMode is OK");
});

QUnit.test("'isAdaptive' subscribe should work correctly", function(assert) {
    this.createInstance({
        dataSource: [],
        adaptivityEnabled: true
    });

    assert.ok(this.instance.fire("isAdaptive"), "Scheduler is adaptive");

    this.instance.option("adaptivityEnabled", false);

    this.clock.tick(300);
    assert.notOk(this.instance.fire("isAdaptive"), "Scheduler isn't adaptive");
});

QUnit.test("'getDropDownAppointmentWidth' and 'getDropDownAppointmentHeight' subscribes should work correctly", function(assert) {
    this.createInstance({
        dataSource: [],
        adaptivityEnabled: true
    });
    this.clock.tick(300);

    let width = this.instance.fire("getDropDownAppointmentWidth");
    let height = this.instance.fire("getDropDownAppointmentHeight");

    assert.equal(height, 28, "Returned height is ok");
    assert.equal(width, 28, "Returned width is ok");
});

QUnit.test("'supportCompactDropDownAppointments' should return true for some views", function(assert) {
    this.createInstance({
        dataSource: [],
        views: ["motnh", "week"],
        currentView: "week"
    });
    this.clock.tick(300);

    assert.ok(this.instance.fire("supportCompactDropDownAppointments"));

    this.instance.option("currentView", "month");

    assert.notOk(this.instance.fire("supportCompactDropDownAppointments"));
});

QUnit.module("Agenda", {
    beforeEach: function() {
        this.createInstance = function(options) {
            this.instance = $("#scheduler").dxScheduler(options).dxScheduler("instance");
        };
        fx.off = true;
    },
    afterEach: function() {
        fx.off = false;
    }
});

QUnit.test("Agenda row count calculation", function(assert) {
    this.createInstance({
        views: ["agenda"],
        currentView: "agenda"
    });
    var instance = this.instance,
        expectedRows = [0, 1, 17, 19, 21, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52];

    instance._reloadDataSource = function() {
        this._dataSourceLoadedCallback.fireWith(this, [[
            { startDate: new Date(2016, 1, 2), endDate: new Date(2016, 1, 2, 0, 30) },
            { startDate: new Date(2016, 1, 20), endDate: new Date(2016, 1, 20, 0, 30) },
            { startDate: new Date(2016, 1, 18), endDate: new Date(2016, 1, 18, 0, 30) },
            { startDate: new Date(2016, 1, 18), endDate: new Date(2016, 1, 18, 0, 30) },
            { startDate: new Date(2016, 1, 22), endDate: new Date(2016, 1, 22, 0, 30) },
            { startDate: new Date(2016, 2, 2), endDate: new Date(2016, 2, 22, 0, 30) },

            { startDate: new Date(2016, 0, 30), endDate: new Date(2016, 1, 1, 5, 30) },

            { startDate: new Date(2016, 2, 23), endDate: new Date(2016, 2, 24, 5, 30) }
        ]]);
    };

    instance.fire("getAgendaRows", {
        agendaDuration: 65,
        currentDate: new Date(2016, 1, 1)
    }).done(function(result) {

        assert.equal(result.length, 1, "Rows are OK");

        $.each(result[0], function(index, item) {
            if($.inArray(index, expectedRows) > -1) {
                if(index === 17) {
                    assert.equal(item, 2, "Row is OK");
                } else {
                    assert.equal(item, 1, "Row is OK");
                }
            } else {
                assert.equal(item, 0, "Row is OK");
            }
        });

        assert.notOk(instance._dataSourceLoadedCallback.has(), "Callback was removed from list");
    });

    instance._reloadDataSource();
});

QUnit.test("Agenda row count calculation with recurrence appointments", function(assert) {
    this.createInstance({
        views: ["agenda"],
        currentView: "agenda"
    });
    var instance = this.instance,
        endViewDateStub = sinon.stub(instance, "getEndViewDate").returns(new Date(2016, 1, 5, 23, 59)),
        startViewDateStub = sinon.stub(instance, "getStartViewDate").returns(new Date(2016, 1, 1));

    try {
        instance._reloadDataSource = function() {
            this._dataSourceLoadedCallback.fireWith(this, [[
                { startDate: new Date(2016, 1, 2), endDate: new Date(2016, 1, 2, 0, 30) },
                { startDate: new Date(2016, 1, 3), endDate: new Date(2016, 1, 3, 0, 30), recurrenceRule: "FREQ=DAILY" },
                { startDate: new Date(2016, 0, 31), endDate: new Date(2016, 0, 31, 0, 30), recurrenceRule: "FREQ=DAILY" }
            ]]);
        };

        instance.fire("getAgendaRows", {
            agendaDuration: 5,
            currentDate: new Date(2016, 1, 1)
        }).done(function(rows) {
            assert.deepEqual(rows, [[1, 2, 2, 2, 2]], "Rows are OK");
        });

        instance._reloadDataSource();
    } finally {
        endViewDateStub.restore();
        startViewDateStub.restore();
    }
});

QUnit.test("Agenda row count calculation with wrong endDate appointments", function(assert) {
    this.createInstance({
        views: ["agenda"],
        currentView: "agenda"
    });
    var instance = this.instance,
        endViewDateStub = sinon.stub(instance, "getEndViewDate").returns(new Date(2016, 1, 5, 23, 59)),
        startViewDateStub = sinon.stub(instance, "getStartViewDate").returns(new Date(2016, 1, 1));

    try {
        instance._reloadDataSource = function() {
            this._dataSourceLoadedCallback.fireWith(this, [[
                { startDate: new Date(2016, 1, 2), endDate: new Date(2016, 1, 2, 0, 30) },
                { startDate: new Date(2016, 1, 3, 3, 30), endDate: new Date(2016, 1, 3) },
                { startDate: new Date(2016, 1, 4), endDate: new Date(2016, 1, 4, 0, 30) }
            ]]);
        };

        instance.fire("getAgendaRows", {
            agendaDuration: 5,
            currentDate: new Date(2016, 1, 1)
        }).done(function(rows) {
            assert.deepEqual(rows, [[0, 1, 1, 1, 0]], "Rows are OK");
        });

        instance._reloadDataSource();
    } finally {
        endViewDateStub.restore();
        startViewDateStub.restore();
    }
});

QUnit.test("Agenda row count calculation with long appointments", function(assert) {
    this.createInstance({
        views: ["agenda"],
        currentView: "agenda"
    });
    var instance = this.instance,
        endViewDateStub = sinon.stub(instance, "getEndViewDate").returns(new Date(2016, 1, 5, 23, 59)),
        startViewDateStub = sinon.stub(instance, "getStartViewDate").returns(new Date(2016, 1, 1));

    try {
        instance._reloadDataSource = function() {
            this._dataSourceLoadedCallback.fireWith(this, [[
                { startDate: new Date(2016, 1, 1, 1), endDate: new Date(2016, 1, 4, 10, 30) }
            ]]);
        };

        instance.fire("getAgendaRows", {
            agendaDuration: 5,
            currentDate: new Date(2016, 1, 1)
        }).done(function(rows) {
            assert.deepEqual(rows, [[1, 1, 1, 1, 0]], "Rows are OK");
        });

        instance._reloadDataSource();
    } finally {
        endViewDateStub.restore();
        startViewDateStub.restore();
    }
});

QUnit.test("Agenda row count calculation with long recurrence appointments", function(assert) {
    this.createInstance({
        startDateExpr: "Start",
        endDateExpr: "End",
        recurrenceRuleExpr: "RecurrenceRule",
        views: ["agenda"],
        currentView: "agenda"
    });
    var instance = this.instance,
        endViewDateStub = sinon.stub(instance, "getEndViewDate").returns(new Date(2016, 2, 1, 23, 59)),
        startViewDateStub = sinon.stub(instance, "getStartViewDate").returns(new Date(2016, 1, 24));

    try {
        instance._reloadDataSource = function() {
            this._dataSourceLoadedCallback.fireWith(this, [[
                {
                    Start: new Date(2016, 1, 22, 1).toString(),
                    End: new Date(2016, 1, 23, 1, 30).toString(),
                    RecurrenceRule: "FREQ=DAILY;INTERVAL=3"
                }
            ]]);
        };

        instance.fire("getAgendaRows", {
            agendaDuration: 7,
            currentDate: new Date(2016, 1, 24).toString()
        }).done(function(rows) {
            assert.deepEqual(rows, [[0, 1, 1, 0, 1, 1, 0]], "Rows are OK");
        });

        instance._reloadDataSource();
    } finally {
        endViewDateStub.restore();
        startViewDateStub.restore();
    }
});

QUnit.test("Agenda row count calculation with groups", function(assert) {
    this.createInstance({
        groups: ["ownerId"],
        resources: [{
            field: "ownerId",
            dataSource: [
                { id: 1 },
                { id: 2 },
                { id: 3 }
            ],
            allowMultiple: true
        }],
        views: ["agenda"],
        currentView: "agenda"
    });
    var instance = this.instance;

    instance._reloadDataSource = function() {
        this._dataSourceLoadedCallback.fireWith(this, [[
            { startDate: new Date(2016, 1, 2), endDate: new Date(2016, 1, 2, 1), ownerId: 1 },
            { startDate: new Date(2016, 1, 3), endDate: new Date(2016, 1, 3, 1), ownerId: 2 },
            { startDate: new Date(2016, 1, 3), endDate: new Date(2016, 1, 3, 1), ownerId: 1 },
            { startDate: new Date(2016, 1, 3, 2), endDate: new Date(2016, 1, 3, 3), ownerId: 1 },
            { startDate: new Date(2016, 1, 5), endDate: new Date(2016, 1, 5, 1), ownerId: [1, 2] },
            { startDate: new Date(2016, 1, 4), endDate: new Date(2016, 1, 4, 1), ownerId: 2 }
        ]]);
    };

    instance.fire("getAgendaRows", {
        agendaDuration: 7,
        currentDate: new Date(2016, 1, 1)
    }).done(function(result) {
        assert.equal(result.length, 3, "Rows are OK");
        assert.deepEqual(result[0], [0, 1, 2, 0, 1, 0, 0], "Row is OK");
        assert.deepEqual(result[1], [0, 0, 1, 1, 1, 0, 0], "Row is OK");
        assert.strictEqual(result[2].length, 0, "Row is OK");
    });

    instance._reloadDataSource();
});

QUnit.test("Agenda should work when current view is changed", function(assert) {
    this.createInstance({
        views: ["agenda", "week"],
        currentView: "week",
        currentDate: new Date(2016, 2, 1),
        dataSource: [{ startDate: new Date(2016, 2, 1, 1), endDate: new Date(2016, 2, 1, 2) }]
    });

    this.instance.option("currentView", "agenda");

    assert.ok(true, "Agenda works");
});

QUnit.module("Grouping By Date", {
    beforeEach: function() {
        this.createInstance = function(options) {
            this.instance = $("#scheduler").dxScheduler(options).dxScheduler("instance");
            this.scheduler = new SchedulerTestWrapper(this.instance);
        };
        fx.off = true;
    },
    afterEach: function() {
        fx.off = false;
    }
});

QUnit.test("'isGroupedByDate' should be true only for horizontal grouped workspace with groups", function(assert) {
    this.createInstance({
        views: [{
            name: "DAY",
            type: "day",
            groupOrientation: "horizontal"
        }, {
            name: "WEEK",
            type: "week",
            groupOrientation: "vertical"
        }],
        currentView: "DAY",
        dataSource: [],
        groupByDate: true,
        groups: ["priorityId"],
        resources: [{
            field: "typeId",
            dataSource: [{ id: 1, color: "red" }]
        },
        {
            field: "priorityId",
            dataSource: [{ id: 1, color: "black" }]
        }
        ]
    });

    assert.equal(this.instance.fire("isGroupedByDate"), true, "Workspace is grouped by date");

    this.instance.option("currentView", "WEEK");
    assert.equal(this.instance.fire("isGroupedByDate"), false, "Workspace isn't grouped by date");

    this.instance.option("groups", []);
    this.instance.option("currentView", "DAY");
    assert.equal(this.instance.fire("isGroupedByDate"), false, "Workspace isn't grouped by date");
});

QUnit.test("'needCoordinates' should work correct when groupByDate = true, Day view", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        }
    ];
    this.createInstance({
        currentView: "day",
        views: [{
            type: "day",
            name: "day",
            intervalCount: 2
        }],
        currentDate: new Date(2018, 4, 21, 9, 0),
        groupByDate: true,
        startDayHour: 9,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2018, 4, 21, 9, 0),
            priorityId: 2
        },
        startDate: new Date(2018, 4, 21, 9, 0),
        callback: function(result) {
            result = result[0];
            assert.equal(result.cellIndex, 0, "Coordinates are OK");
            assert.equal(result.rowIndex, 0, "Coordinates are OK");
            assert.equal(result.top, 0, "Coordinates are OK");
            assert.roughEqual(result.left, 324, 1.1, "Coordinates are OK");
        }
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2018, 4, 22, 9, 0),
            priorityId: 1
        },
        startDate: new Date(2018, 4, 22, 9, 0),
        callback: function(result) {
            result = result[0];
            assert.equal(result.cellIndex, 1, "Coordinates are OK");
            assert.equal(result.rowIndex, 0, "Coordinates are OK");
            assert.equal(result.top, 0, "Coordinates are OK");
            assert.roughEqual(result.left, 548, 1.1, "Coordinates are OK");
        }
    });
});

QUnit.test("'needCoordinates' should work correct for allDay appointment when groupByDate = true, Week view", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        }
    ];
    this.createInstance({
        currentView: "week",
        views: [{
            type: "week",
            name: "week",
            intervalCount: 2
        }],
        currentDate: new Date(2018, 4, 21, 9, 0),
        groupByDate: true,
        startDayHour: 9,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2018, 4, 21, 9, 0),
            endDate: new Date(2018, 4, 23, 9, 0),
            priorityId: 2,
            allDay: true
        },
        startDate: new Date(2018, 4, 21, 9, 0),
        callback: function(results) {
            assert.equal(results.length, 2, "Result length is OK");

            var result = results[0];
            assert.equal(result.cellIndex, 1, "Coordinates are OK");
            assert.equal(result.rowIndex, 0, "Coordinates are OK");
            assert.equal(result.top, 0, "Coordinates are OK");
            assert.roughEqual(result.left, 196, 1.1, "Coordinates are OK");

            result = results[1];
            assert.equal(result.cellIndex, 2, "Coordinates are OK");
            assert.equal(result.rowIndex, 0, "Coordinates are OK");
            assert.equal(result.top, 0, "Coordinates are OK");
            assert.roughEqual(result.left, 260, 1.1, "Coordinates are OK");
        }
    });
});

QUnit.test("'needCoordinates' should work correct when groupByDate = true, Week view", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        }
    ];
    this.createInstance({
        currentView: "week",
        views: ["week"],
        currentDate: new Date(2018, 4, 21, 9, 0),
        groupByDate: true,
        startDayHour: 9,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2018, 4, 22, 10, 0),
            priorityId: 2
        },
        startDate: new Date(2018, 4, 22, 10, 0),
        callback: function(result) {
            result = result[0];
            assert.equal(result.cellIndex, 2, "Coordinates are OK");
            assert.equal(result.rowIndex, 2, "Coordinates are OK");
            assert.equal(result.top, 100, "Coordinates are OK");
            assert.roughEqual(result.left, 420, 1.5, "Coordinates are OK");
        }
    });

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2018, 4, 25, 1, 0),
            priorityId: 1
        },
        startDate: new Date(2018, 4, 25, 11, 0),
        callback: function(result) {
            result = result[0];
            assert.equal(result.cellIndex, 5, "Coordinates are OK");
            assert.equal(result.rowIndex, 4, "Coordinates are OK");
            assert.equal(result.top, 200, "Coordinates are OK");
            assert.roughEqual(result.left, 740, 1.5, "Coordinates are OK");
        }
    });
});


QUnit.test("'needCoordinates' should work correct when groupByDate = true, Month view", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        }
    ];
    this.createInstance({
        currentView: "month",
        views: [{
            type: "month",
            name: "month",
            groupOrientation: "horizontal"
        }],
        currentDate: new Date(2018, 4, 21, 9, 0),
        groupByDate: true,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });

    var $cell = this.instance.$element().find(".dx-scheduler-date-table-cell").eq(0).get(0),
        cellWidth = $cell.getBoundingClientRect().width,
        cellHeight = $cell.getBoundingClientRect().height;

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2018, 4, 22, 10, 0),
            endDate: new Date(2018, 4, 24),
            priorityId: 2
        },
        startDate: new Date(2018, 4, 22, 10, 0),
        callback: function(results) {
            assert.equal(results.length, 2, "Coordinates count is ok");

            var result = results[0];
            assert.equal(result.cellIndex, 2, "Coordinates are OK");
            assert.equal(result.rowIndex, 3, "Coordinates are OK");
            assert.equal(result.top, cellHeight * 3, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 5, 1.5, "Coordinates are OK");

            result = results[1];
            assert.equal(result.cellIndex, 3, "Coordinates are OK");
            assert.equal(result.rowIndex, 3, "Coordinates are OK");
            assert.equal(result.top, cellHeight * 3, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 7, 1.5, "Coordinates are OK");
        }
    });
});

QUnit.test("'needCoordinates' should work correct for recurrenceAppointment when groupByDate = true, Month view", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        }
    ];
    this.createInstance({
        currentView: "month",
        views: [{
            type: "month",
            name: "month",
            groupOrientation: "horizontal"
        }],
        currentDate: new Date(2018, 4, 21, 9, 0),
        groupByDate: true,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });

    var $cell = this.instance.$element().find(".dx-scheduler-date-table-cell").eq(0).get(0),
        cellWidth = $cell.getBoundingClientRect().width,
        cellHeight = $cell.getBoundingClientRect().height;

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2018, 4, 22, 10, 0),
            endDate: new Date(2018, 4, 23, 12),
            priorityId: 2,
            recurrenceRule: "FREQ=DAILY;COUNT=3"
        },
        startDate: new Date(2018, 4, 22, 10, 0),
        callback: function(results) {
            assert.equal(results.length, 6, "Coordinates count is ok");

            var result = results[0];
            assert.equal(result.cellIndex, 2, "Coordinates are OK");
            assert.equal(result.rowIndex, 3, "Coordinates are OK");
            assert.equal(result.top, cellHeight * 3, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 5, 1.5, "Coordinates are OK");

            result = results[1];
            assert.equal(result.cellIndex, 3, "Coordinates are OK");
            assert.equal(result.rowIndex, 3, "Coordinates are OK");
            assert.equal(result.top, cellHeight * 3, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 7, 1.5, "Coordinates are OK");

            result = results[2];
            assert.equal(result.cellIndex, 3, "Coordinates are OK");
            assert.equal(result.rowIndex, 3, "Coordinates are OK");
            assert.equal(result.top, cellHeight * 3, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 7, 1.5, "Coordinates are OK");

            result = results[3];
            assert.equal(result.cellIndex, 4, "Coordinates are OK");
            assert.equal(result.rowIndex, 3, "Coordinates are OK");
            assert.equal(result.top, cellHeight * 3, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 9, 1.5, "Coordinates are OK");

            result = results[4];
            assert.equal(result.cellIndex, 4, "Coordinates are OK");
            assert.equal(result.rowIndex, 3, "Coordinates are OK");
            assert.equal(result.top, cellHeight * 3, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 9, 1.5, "Coordinates are OK");

            result = results[5];
            assert.equal(result.cellIndex, 5, "Coordinates are OK");
            assert.equal(result.rowIndex, 3, "Coordinates are OK");
            assert.equal(result.top, cellHeight * 3, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 11, 1.5, "Coordinates are OK");
        }
    });
});

QUnit.test("'needCoordinates' should work correct when groupByDate = true, Timeline view", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        }
    ];
    this.createInstance({
        currentView: "timelineWeek",
        views: [{
            type: "timelineWeek",
            name: "timelineWeek",
            groupOrientation: "horizontal"
        }],
        currentDate: new Date(2018, 4, 21),
        cellDuration: 60,
        groupByDate: true,
        startDayHour: 10,
        endDayHour: 12,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });

    var cellWidth = this.instance.$element().find(".dx-scheduler-date-table-cell").eq(0).get(0).getBoundingClientRect().width;

    this.instance.fire("needCoordinates", {
        appointmentData: {
            startDate: new Date(2018, 4, 21, 10, 0),
            endDate: new Date(2018, 4, 21, 12, 0),
            priorityId: 2
        },
        startDate: new Date(2018, 4, 21, 10, 0),
        callback: function(results) {
            var result = results[0];
            assert.equal(result.cellIndex, 2, "Coordinates are OK");
            assert.equal(result.rowIndex, 0, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 5, 1.5, "Coordinates are OK");

            result = results[1];
            assert.equal(result.cellIndex, 3, "Coordinates are OK");
            assert.equal(result.rowIndex, 0, "Coordinates are OK");
            assert.roughEqual(result.left, cellWidth * 7, 1.5, "Coordinates are OK");
        }
    });
});

QUnit.test("'getResizableAppointmentArea' should return correct area when groupByDate = true, Month view", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        },
        {
            text: "Middle Priority",
            id: 3,
            color: "#ff9747"
        }
    ];
    this.createInstance({
        currentView: "month",
        views: [{
            type: "month",
            name: "month",
            groupOrientation: "horizontal"
        }],
        width: 800,
        currentDate: new Date(2018, 4, 21, 9, 0),
        groupByDate: true,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });

    var $firstCell = this.instance.$element().find(".dx-scheduler-date-table-cell").first(),
        $lastCell = this.instance.$element().find(".dx-scheduler-date-table-cell").last(),
        firstCellPosition = $firstCell.offset(),
        lastCellPosition = $lastCell.offset(),
        cellWidth = $lastCell.get(0).getBoundingClientRect().width;

    this.instance.fire("getResizableAppointmentArea", {
        allDay: false,
        coordinates: {
            groupIndex: 1,
            left: 550,
            top: 0
        },
        callback: function(result) {
            assert.roughEqual(result.left, firstCellPosition.left - cellWidth / 2, 3, "Area left is OK");
            assert.roughEqual(result.right, lastCellPosition.left + 1.5 * cellWidth, 3, "Area right is OK");
        }
    });
});

QUnit.test("'getResizableStep' should return correct step, groupByDate = true, Month view", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        },
        {
            text: "Middle Priority",
            id: 3,
            color: "#ff9747"
        }
    ];
    this.createInstance({
        currentView: "month",
        dataSource: [{
            startDate: new Date(2018, 4, 21, 9, 0),
            endDate: new Date(2018, 4, 21, 9, 30),
            priorityId: 1
        }],
        views: [{
            type: "month",
            name: "month",
            groupOrientation: "horizontal"
        }],
        width: 800,
        currentDate: new Date(2018, 4, 21, 9, 0),
        groupByDate: true,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });

    var $cell = this.instance.$element().find(".dx-scheduler-date-table-cell").eq(0),
        cellWidth = $cell.get(0).getBoundingClientRect().width;

    assert.roughEqual(this.instance.fire("getResizableStep"), cellWidth * 3, 3, "Step is OK");
});

QUnit.test("Appointment is rendered in allDay panel if endDate is out of view, groupByDate = true (T742932)", function(assert) {
    var priorityData = [
        {
            text: "Low Priority",
            id: 1,
            color: "#1e90ff"
        }, {
            text: "High Priority",
            id: 2,
            color: "#ff9747"
        }
    ];

    this.createInstance({
        currentView: "day",
        dataSource: [
            {
                text: "Website Re-Design Plan",
                priorityId: 2,
                startDate: new Date(2018, 4, 21, 9, 30),
                endDate: new Date(2018, 4, 23, 11, 30)
            }],
        views: [{
            type: "day",
            name: "Day"
        }],
        width: 800,
        groupByDate: true,
        currentDate: new Date(2018, 4, 21),
        startDayHour: 9,
        endDayHour: 16,
        groups: ["priorityId"],
        resources: [
            {
                fieldExpr: "priorityId",
                allowMultiple: false,
                dataSource: priorityData,
                label: "Priority"
            }
        ],
    });
    assert.equal(this.scheduler.appointments.getAppointmentCount(), 1, "Appointment is rendered");
});
