/**
 * Created by mckeowr on 9/29/16.
 */
describe('com.mcgraphix.odata.filter', function() {

    beforeEach(module('com.mcgraphix.odata.filter'));

    var ODataFilter;
    beforeEach(inject(function(_ODataFilter_) {
        ODataFilter = _ODataFilter_
    }));


    it('Null string is not parsed', function() {
        expect(ODataFilter.parse(null)).toBeNull();
    });

    it('Empty string is not parsed', function() {
        expect(ODataFilter.parse('')).toBeNull();
    });

    it('Simple binary expression test', function () {
        var s = "name eq 'test'";
        var obj = ODataFilter.parse(s);
        expect(obj.subject).toBe("name");
        expect(obj.operator).toBe("eq");
        expect(obj.value).toBe("'test'");
    });

    it('Simple binary expression with String with spaces', function () {
        var s = "name eq 'test of strings'";
        var obj = ODataFilter.parse(s);
        expect(obj.subject).toBe("name");
        expect(obj.operator).toBe("eq");
        expect(obj.value).toBe("'test of strings'");
    });

    it('Simple binary expression with a number value', function () {
        var s = "id gt 5";
        var obj = ODataFilter.parse(s);
        expect(obj.subject).toBe("id");
        expect(obj.operator).toBe("gt");
        expect(obj.value).toBe(5);
    });

    it('Simple binary expression with a number value enclosed with parenthesis', function () {
        var s = "(id lt 5)";
        var obj = ODataFilter.parse(s);
        expect(obj.subject).toBe("id");
        expect(obj.operator).toBe("lt");
        expect(obj.value).toBe(5);
    });

    it('Simple binary expression with text containing parenthesis', function() {
        var s = "name eq 'ultramarine (R)'";
        var obj = ODataFilter.parse(s);
        expect(obj.subject).toBe("name");
        expect(obj.operator).toBe("eq");
        expect(obj.value).toBe("'ultramarine (R)'");
    });

    it('Simple binary expression with text containing parenthesis and bracketted parenthesis', function() {
        var s = "(name eq 'ultramarine [R]')";
        var obj = ODataFilter.parse(s);
        expect(obj.subject).toBe("name");
        expect(obj.operator).toBe("eq");
        expect(obj.value).toBe("'ultramarine [R]'");
    });

    it('Compound binary expression with text containing parenthesis', function() {
        var s = "((name eq 'ultramarine (R)') and (rate eq '1d'))";
        var obj = ODataFilter.parse(s);
        expect(obj.subExpressions.length).toBe(3);

        expect(obj.subExpressions[0].subject).toBe("name");
        expect(obj.subExpressions[0].operator).toBe("eq");
        expect(obj.subExpressions[0].value).toBe("'ultramarine (R)'");

        expect(obj.subExpressions[1].type).toBe("and");

        expect(obj.subExpressions[2].subject).toBe("rate");
        expect(obj.subExpressions[2].operator).toBe("eq");
        expect(obj.subExpressions[2].value).toBe("'1d'");


    });

    it('Compound binary expression with text containing parenthesis with some expressions without parens', function() {
        var s = "((name eq 'ultramarine (R)') and rate eq '1d')";
        var obj = ODataFilter.parse(s);
        expect(obj.subExpressions.length).toBe(3);

        expect(obj.subExpressions[0].subject).toBe("name");
        expect(obj.subExpressions[0].operator).toBe("eq");
        expect(obj.subExpressions[0].value).toBe("'ultramarine (R)'");

        expect(obj.subExpressions[1].type).toBe("and");

        expect(obj.subExpressions[2].subject).toBe("rate");
        expect(obj.subExpressions[2].operator).toBe("eq");
        expect(obj.subExpressions[2].value).toBe("'1d'");


    });

    it('Compound binary expression with parenthesis on value', function () {
        var s = "((name eq 'Bob') and (id gt 5))";
        var obj = ODataFilter.parse(s);
        expect(obj.subExpressions.length).toBe(3);

        expect(obj.subExpressions[0].subject).toBe("name");
        expect(obj.subExpressions[0].operator).toBe("eq");
        expect(obj.subExpressions[0].value).toBe("'Bob'");

        expect(obj.subExpressions[1].type).toBe("and");

        expect(obj.subExpressions[2].subject).toBe("id");
        expect(obj.subExpressions[2].operator).toBe("gt");
        expect(obj.subExpressions[2].value).toBe(5);
    });


    it('More complex multiple binary expressions', function() {
        var s = "(name eq 'Bob' and (lastName eq 'Smiley' and (weather ne 'sunny' or temp ge 54)))";
        var obj = ODataFilter.parse(s);

        expect(obj.subExpressions.length).toBe(3);

        expect(obj.subExpressions[0].subject).toBe("name");
        expect(obj.subExpressions[0].operator).toBe("eq");
        expect(obj.subExpressions[0].value).toBe("'Bob'");

        expect(obj.subExpressions[1].type).toBe("and");

        expect(obj.subExpressions[2].subExpressions[0].subject).toBe("lastName");
        expect(obj.subExpressions[2].subExpressions[0].operator).toBe("eq");
        expect(obj.subExpressions[2].subExpressions[0].value).toBe("'Smiley'");

        expect(obj.subExpressions[2].subExpressions[1].type).toBe("and");

        expect(obj.subExpressions[2].subExpressions[2].subExpressions[0].subject).toBe("weather");
        expect(obj.subExpressions[2].subExpressions[2].subExpressions[0].operator).toBe("ne");
        expect(obj.subExpressions[2].subExpressions[2].subExpressions[0].value).toBe("'sunny'");

        expect(obj.subExpressions[2].subExpressions[2].subExpressions[1].type).toBe("or");

        expect(obj.subExpressions[2].subExpressions[2].subExpressions[2].subject).toBe("temp");
        expect(obj.subExpressions[2].subExpressions[2].subExpressions[2].operator).toBe("ge");
        expect(obj.subExpressions[2].subExpressions[2].subExpressions[2].value).toBe(54);



    });

    it('Verify startsWith condition', function() {
        var s = "startswith(name,'Ja')";
        var obj = ODataFilter.parse(s);
        expect( obj.subject).toBe('startswith(name,\'Ja\')');
        expect( obj.value).toBeTruthy();
        expect( obj.operator).toBe('eq');
    });


    it('Verify endsWith condition', function() {
        var s = "endswith(name,'Hole')";
        var obj = ODataFilter.parse(s);
        expect( obj.subject).toBe('endswith(name,\'Hole\')');
        expect( obj.value).toBeTruthy();
        expect( obj.operator).toBe('eq');
    });

    it('Verify contains condition', function() {
        var s = "contains(name,'Something')";
        var obj = ODataFilter.parse(s);
        expect( obj.subject).toBe('contains(name,\'Something\')');
        expect( obj.value).toBeTruthy();
        expect( obj.operator).toBe('eq');
    });

    it('Verify substring condition', function() {
        var s = "substring(name, 1) eq 'ob'";
        var obj = ODataFilter.parse(s);
        expect( obj.subject).toBe('substring(name, 1)');
        expect( obj.value).toBe("'ob'");
        expect( obj.operator).toBe('eq');
    });

    it('Verify substring conditions when combined with others', function() {
        var s = "substring(name, 1) eq 'ob' or foo eq 'bar'";
        var obj = ODataFilter.parse(s);
        var exp1 = obj.subExpressions[0];
        var join = obj.subExpressions[1];
        var exp2 = obj.subExpressions[2];

        expect( exp1.subject).toBe('substring(name, 1)');
        expect( exp1.value).toBe("'ob'");
        expect( exp1.operator).toBe('eq');

        expect(join.type).toBe('or');

        expect( exp2.subject).toBe('foo');
        expect( exp2.operator).toBe('eq');
        expect( exp2.value).toBe("'bar'");

    });

    it('Verify substring conditions when combined with others and parens', function() {
        var s = "(foo eq 'bar' and substring(name, 1) eq 'ob')";
        var obj = ODataFilter.parse(s);
        var exp1 = obj.subExpressions[0];
        var join = obj.subExpressions[1];
        var exp2 = obj.subExpressions[2];

        expect( exp1.subject).toBe('foo');
        expect( exp1.operator).toBe('eq');
        expect( exp1.value).toBe("'bar'");

        expect(join.type).toBe('and');

        expect( exp2.subject).toBe('substring(name, 1)');
        expect( exp2.value).toBe("'ob'");
        expect( exp2.operator).toBe('eq');

    });

});
