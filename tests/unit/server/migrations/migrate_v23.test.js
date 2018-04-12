import { expect } from 'chai';
import sinon from 'sinon';
import proxyquire from 'proxyquire';

let Meteor = {};

let MinutesSchemaCollection = {
    update: sinon.spy()
};
let MinutesSchema = {
    find: sinon.stub(),
    getCollection: sinon.stub()
};

let TopicSchemaCollection = {
    update: sinon.spy()
};
let TopicSchema = {
    find: sinon.stub(),
    getCollection: sinon.stub()
};

const {
    MigrateV23
} = proxyquire('../../../../server/migrations/migrate_v23', {
    'meteor/meteor': { Meteor, '@noCallThru': true},
    '/imports/collections/minutes.schema': { MinutesSchema, '@noCallThru': true},
    '/imports/collections/topic.schema': { TopicSchema, '@noCallThru': true},
});

describe('MigrateV23', function () {
    describe('#up', function () {
        const topicWithResponsiblesNull = {
                responsibles: null
            },
            topicsWithResponsiblesDefined = {
                responsibles: [1, 2, 3]
            };
        
        beforeEach(function () {
            TopicSchema.find.returns([]);
            MinutesSchema.find.returns([]);
            MinutesSchema.getCollection.returns(MinutesSchemaCollection);
            TopicSchema.getCollection.returns(TopicSchemaCollection);
        });

        afterEach(function () {
            TopicSchema.find.reset();
            TopicSchema.getCollection.reset();
            TopicSchemaCollection.update.reset();

            MinutesSchema.find.reset();
            MinutesSchema.getCollection.reset();
            MinutesSchemaCollection.update.reset();
        });

        it('calls update method for every topic in the topic collection which has no responsibles set', function () {
            const topics = [topicWithResponsiblesNull, topicsWithResponsiblesDefined];
            TopicSchema.find.returns(topics);

            MigrateV23.up();

            const expectedNumberOfCallsToUpdate = 1;
            expect(TopicSchemaCollection.update.callCount).to.equal(expectedNumberOfCallsToUpdate);
        });

        it('converts null in topic collection entries to an empty array', function () {
            TopicSchema.find.returns([topicWithResponsiblesNull]);

            MigrateV23.up();

            expect(TopicSchemaCollection.update.calledWithExactly(undefined, {$set: {responsibles: []}})).to.be.true;
        });

        it('does not update topics with responsibles already set', function () {
            TopicSchema.find.returns([topicsWithResponsiblesDefined]);

            MigrateV23.up();

            expect(TopicSchemaCollection.update.called).to.be.false;
        });

        it('calls the update method for every minutes which contains at least one topic where the responsibles field is not an array', function () {
            const minutes = [{topics: [topicWithResponsiblesNull]}];
            MinutesSchema.find.returns(minutes);

            MigrateV23.up();

            const expectedNumberOfCallsToUpdate = 1;
            expect(MinutesSchemaCollection.update.callCount).to.equal(expectedNumberOfCallsToUpdate);
        });

        it('converts null in topic collection entries to an empty array', function () {
            const minutesWithATopicWithNull = [{topics: [topicWithResponsiblesNull]}];
            MinutesSchema.find.returns(minutesWithATopicWithNull);

            MigrateV23.up();

            expect(MinutesSchemaCollection.update.calledWithExactly(undefined, {$set: {topics: [{responsibles: []}]}})).to.be.true;
        });

        it('does not modify responsibles that already are defined', function () {
            const minutesWithATopicWithNull = [{topics: [topicsWithResponsiblesDefined]}];
            MinutesSchema.find.returns(minutesWithATopicWithNull);

            MigrateV23.up();

            expect(MinutesSchemaCollection.update.calledWithExactly(undefined, {$set: {topics: [topicsWithResponsiblesDefined]}})).to.be.true;
        });
    });
});