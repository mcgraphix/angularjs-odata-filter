/**
 * Created by mckeowr on 9/29/16.
 */
describe('com.mcgraphix.odata.filter', function () {

    beforeEach(module('com.mcgraphix.odata.filter'));
    describe('ODataEvaluator', function () {
        var ODataEvaluator;
        beforeEach(inject(function (_ODataEvaluator_) {
            ODataEvaluator = _ODataEvaluator_;
        }));


        it('Null string is not parsed', function () {
            expect(ODataEvaluator.parse(null)).toBeNull();
        });

        it('Empty string is not parsed', function () {
            expect(ODataEvaluator.parse('')).toBeNull();
        });

        it('Simple binary expression test', function () {
            var s = "name eq 'test'";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subject).toBe("name");
            expect(obj.operator).toBe("eq");
            expect(obj.value).toBe("'test'");
        });

        it('Simple binary expression with String with spaces', function () {
            var s = "name eq 'test of strings'";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subject).toBe("name");
            expect(obj.operator).toBe("eq");
            expect(obj.value).toBe("'test of strings'");
        });

        it('Simple binary expression with a number value', function () {
            var s = "id gt 5";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subject).toBe("id");
            expect(obj.operator).toBe("gt");
            expect(obj.value).toBe(5);
        });

        it('Simple binary expression with a number value enclosed with parenthesis', function () {
            var s = "(id lt 5)";
            var obj = ODataEvaluator.parse(s).subExpressions[0];
            expect(obj.subject).toBe("id");
            expect(obj.operator).toBe("lt");
            expect(obj.value).toBe(5);
        });

        it('Simple binary expression with text containing parenthesis', function () {
            var s = "name eq 'ultramarine (R)'";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subject).toBe("name");
            expect(obj.operator).toBe("eq");
            expect(obj.value).toBe("'ultramarine (R)'");
        });

        it('Simple binary expression with text containing parenthesis and bracketted parenthesis', function () {
            var s = "(name eq 'ultramarine [R]')";
            var obj = ODataEvaluator.parse(s).subExpressions[0];
            expect(obj.subject).toBe("name");
            expect(obj.operator).toBe("eq");
            expect(obj.value).toBe("'ultramarine [R]'");
        });

        it('Compound binary expression with text containing parenthesis', function () {
            var s = "((name eq 'ultramarine (R)') and (rate eq '1d'))";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subExpressions.length).toBe(3);

            expect(obj.subExpressions[0].subExpressions[0].subject).toBe("name");
            expect(obj.subExpressions[0].subExpressions[0].operator).toBe("eq");
            expect(obj.subExpressions[0].subExpressions[0].value).toBe("'ultramarine (R)'");

            expect(obj.subExpressions[1].type).toBe("and");

            expect(obj.subExpressions[2].subExpressions[0].subject).toBe("rate");
            expect(obj.subExpressions[2].subExpressions[0].operator).toBe("eq");
            expect(obj.subExpressions[2].subExpressions[0].value).toBe("'1d'");


        });

        it('Compound binary expression with text containing parenthesis with some expressions without parens', function () {
            var s = "((name eq 'ultramarine (R)') and rate eq '1d')";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subExpressions.length).toBe(3);

            expect(obj.subExpressions[0].subExpressions[0].subject).toBe("name");
            expect(obj.subExpressions[0].subExpressions[0].operator).toBe("eq");
            expect(obj.subExpressions[0].subExpressions[0].value).toBe("'ultramarine (R)'");

            expect(obj.subExpressions[1].type).toBe("and");

            expect(obj.subExpressions[2].subject).toBe("rate");
            expect(obj.subExpressions[2].operator).toBe("eq");
            expect(obj.subExpressions[2].value).toBe("'1d'");


        });

        it('Compound binary expression with parenthesis on value', function () {
            var s = "((name eq 'Bob') and (id gt 5))";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subExpressions.length).toBe(3);

            expect(obj.subExpressions[0].subExpressions[0].subject).toBe("name");
            expect(obj.subExpressions[0].subExpressions[0].operator).toBe("eq");
            expect(obj.subExpressions[0].subExpressions[0].value).toBe("'Bob'");

            expect(obj.subExpressions[1].type).toBe("and");

            expect(obj.subExpressions[2].subExpressions[0].subject).toBe("id");
            expect(obj.subExpressions[2].subExpressions[0].operator).toBe("gt");
            expect(obj.subExpressions[2].subExpressions[0].value).toBe(5);
        });


        it('More complex multiple binary expressions', function () {
            var s = "(name eq 'Bob' and (lastName eq 'Smiley' and (weather ne 'sunny' or temp ge 54)))";
            var obj = ODataEvaluator.parse(s);

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

        it('Verify startsWith condition', function () {
            var s = "startswith(name,'Ja')";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subject).toBe('startswith(name,\'Ja\')');
            expect(obj.value).toBeTruthy();
            expect(obj.operator).toBe('eq');
        });


        it('Verify endsWith condition', function () {
            var s = "endswith(name,'Hole')";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subject).toBe('endswith(name,\'Hole\')');
            expect(obj.value).toBeTruthy();
            expect(obj.operator).toBe('eq');
        });

        it('Verify contains condition', function () {
            var s = "contains(name,'Something')";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subject).toBe('contains(name,\'Something\')');
            expect(obj.value).toBeTruthy();
            expect(obj.operator).toBe('eq');
        });

        it('Verify substring condition', function () {
            var s = "substring(name, 1) eq 'ob'";
            var obj = ODataEvaluator.parse(s);
            expect(obj.subject).toBe('substring(name, 1)');
            expect(obj.value).toBe("'ob'");
            expect(obj.operator).toBe('eq');
        });

        it('Verify substring conditions when combined with others', function () {
            var s = "substring(name, 1) eq 'ob' or foo eq 'bar'";
            var obj = ODataEvaluator.parse(s);
            var exp1 = obj.subExpressions[0];
            var join = obj.subExpressions[1];
            var exp2 = obj.subExpressions[2];

            expect(exp1.subject).toBe('substring(name, 1)');
            expect(exp1.value).toBe("'ob'");
            expect(exp1.operator).toBe('eq');

            expect(join.type).toBe('or');

            expect(exp2.subject).toBe('foo');
            expect(exp2.operator).toBe('eq');
            expect(exp2.value).toBe("'bar'");

        });

        it('Verify substring conditions when combined with others and parens', function () {
            var s = "(foo eq 'bar' and substring(name, 1) eq 'ob')";
            var obj = ODataEvaluator.parse(s);
            var exp1 = obj.subExpressions[0];
            var join = obj.subExpressions[1];
            var exp2 = obj.subExpressions[2];

            expect(exp1.subject).toBe('foo');
            expect(exp1.operator).toBe('eq');
            expect(exp1.value).toBe("'bar'");

            expect(join.type).toBe('and');

            expect(exp2.subject).toBe('substring(name, 1)');
            expect(exp2.value).toBe("'ob'");
            expect(exp2.operator).toBe('eq');

        });

        it("should execute an expression against an object correctly", function () {
            var obj = {
                foo: 'bar',
                bar: 'bar2',
                name: 'rob',
                field1: null
            };

            expect(ODataEvaluator.evaluate(obj, 'foo eq \'bar\'')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'foo eq bar')).toBeFalsy();
            expect(ODataEvaluator.evaluate(obj, "substring(name, 1) eq 'ob'")).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, "field1 eq null")).toBeTruthy();
            //NOTE these are testing values of foo and bar, not the strings 'foo' and 'bar'
            expect(ODataEvaluator.evaluate(obj, 'foo lt bar')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'foo gt bar')).toBeFalsy();

        });

        it("should execute an expression with groupings against an object correctly", function () {
            var obj = {
                foo: 'bar',
                bar: 'bar2',
                name: 'rob'
            };

            expect(ODataEvaluator.evaluate(obj, 'foo eq \'bar\' and name eq \'rob\'')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'foo eq bar and name ne \'john\'')).toBeFalsy();
            expect(ODataEvaluator.evaluate(obj, "substring(name, 1) eq 'ob' or foo eq bar")).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'foo lt bar')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'foo gt bar')).toBeFalsy();
        });

        it("should execute an expression with nested groupings against an object correctly", function () {
            var obj = {
                foo: 'bar',
                bar: 'bar2',
                name: 'rob',
                f1: 'field 1',
                f2: 'field 1'
            };

            var obj2 = {
                foo: 'bar',
                bar: 'bar2',
                name: 'john',
                f1: 'blah',
                f2: 'field 1'

            };

            expect(ODataEvaluator.evaluate(obj, '(foo eq \'bar\' and name eq \'rob\') or f1 eq \'blah\'')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj2, '(foo eq \'bar\' and name eq \'rob\') or f1 eq \'blah\'')).toBeTruthy();

            expect(ODataEvaluator.evaluate(obj, 'foo eq bar and name ne \'john\'')).toBeFalsy();
            expect(ODataEvaluator.evaluate(obj, "substring(name, 1) eq 'ob' or foo eq bar")).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'foo lt bar')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'foo gt bar')).toBeFalsy();
        });

        it("should execute an expression with ambiguous groupings against an object correctly", function () {
            var obj = {
                foo: 'bar',
                bar: 'bar2',
                name: 'rob',
                f1: 'field 1',
                f2: 'field 1'
            };


            expect(ODataEvaluator.evaluate(obj, 'foo eq \'bar\' and name eq \'rob\' or f1 eq \'blah\'')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'foo eq \'bar\' and name eq \'joh\' or f1 eq \'blah\'')).toBeFalsy();
            expect(ODataEvaluator.evaluate(obj, 'foo eq \'bar\' and name eq \'joh\' or f1 eq \'field 1\'')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'f1 eq \'field 1\' or foo eq \'bar\' and name eq \'joh\'')).toBeTruthy();
            expect(ODataEvaluator.evaluate(obj, 'f1 eq \'field 2\' or foo eq \'bar\' and name eq \'joh\'')).toBeFalsy();
            expect(ODataEvaluator.evaluate(obj, 'f1 eq \'field 1\' and foo eq \'bar\' or name eq \'joh\'')).toBeTruthy();

        });
    });

    describe('ODataOperators', function () {
        var operators;

        beforeEach(inject(function (_ODataOperators_) {
            operators = _ODataOperators_;
        }));

        it('should compare two values', function () {
            expect(operators.eq('foo', 'foo')).toBeTruthy();
            expect(operators.ne('foo', 'foo2')).toBeTruthy();
            expect(operators.gt('bar', 'bar2')).toBeFalsy();
            expect(operators.gt('foo', 'bar')).toBeTruthy();
            expect(operators.gt(17, 5)).toBeTruthy();
            expect(operators.ge(17, '17')).toBeTruthy();
        });
    });

    describe("ODataFunctions", function () {
        var ODataFunctions;

        beforeEach(inject(function (_ODataFunctions_) {
            ODataFunctions = _ODataFunctions_;
        }));

        it("should substring correctly", function () {
            expect(ODataFunctions.substring('this is a string', 5, 4)).toBe('is a');
        });

        it('should starts with correctly', function () {
            expect(ODataFunctions.startswith('this is a string', 'this')).toBeTruthy();
            expect(ODataFunctions.startswith('this is a string', 'that')).toBeFalsy();
        });

        it('should ends with correctly', function () {
            expect(ODataFunctions.endswith('this is a string', 'a string')).toBeTruthy();
            expect(ODataFunctions.endswith('this is a string', 'a number')).toBeFalsy();
        });

        it('should return the length correctly', function () {
            expect(ODataFunctions.length('this is a string')).toBe(16);
        });

        it('should indexOf correctly', function () {
            expect(ODataFunctions.indexof('this is a string', 'is a')).toBe(5);
        });

        it('should convert case correctly', function () {
            expect(ODataFunctions.toupper('this is a string')).toBe('THIS IS A STRING');
            expect(ODataFunctions.tolower('THIS IS A STRING')).toBe('this is a string');
        });

        it('should trim correctly', function () {
            expect(ODataFunctions.trim('   this is a string')).toBe('this is a string');
            expect(ODataFunctions.trim('this is a string   ')).toBe('this is a string');
            expect(ODataFunctions.trim('this is a string\t')).toBe('this is a string');
        });
    });

    describe("OData filter", function() {

        var $filter, element, $rootScope;
        beforeEach(inject(function(_$filter_, _$rootScope_, $compile) {
            $filter = _$filter_;
            $rootScope = _$rootScope_;

            $rootScope.people = [
                {id: 1, name: 'Jane', location:'Boston', title:"Engineer"},
                {id: 2, name: 'John', location:'Atlanta', title:"Architect"},
                {id: 3, name: 'Mike', location:'New York', title:"Architect"},
                {id: 4, name: 'Peter', location:'Boston', title:"Engineer"},
                {id: 5, name: 'Mary', location:'New York', title:"Architect"},
                {id: 6, name: 'Ann', location:'Atlanta', title:"Engineer"}
            ];

            $rootScope.odataFilter = 'name ne \'\'';

            element = angular.element('<ul><li ng-repeat="person in people | OData:odataFilter"></li></ul>');
            $compile(element)($rootScope);

            $rootScope.$apply();
        }));

        it ("should show all employees", function() {
           expect(element.find('li').length).toBe(6);
        });

        it ("should show only employees that match the expression filter", function() {
            $rootScope.odataFilter = "location eq 'New York'";
            $rootScope.$digest();
            expect(element.find('li').length).toBe(2);

            $rootScope.odataFilter = "location eq 'New York' and title eq 'Engineer'";
            $rootScope.$digest();
            expect(element.find('li').length).toBe(0);

            $rootScope.odataFilter = "location eq 'New York' or title eq 'Engineer'";
            $rootScope.$digest();
            expect(element.find('li').length).toBe(5);

            $rootScope.odataFilter = "location eq 'New York' and id lt 3";
            $rootScope.$digest();
            expect(element.find('li').length).toBe(0);

            $rootScope.odataFilter = "location eq 'New York' and id le 3";
            $rootScope.$digest();
            expect(element.find('li').length).toBe(1);

            $rootScope.odataFilter = "location eq 'New York' and (id le 3 or title eq 'Engineer')";
            $rootScope.$digest();
            expect(element.find('li').length).toBe(1);

        });
    });

});
