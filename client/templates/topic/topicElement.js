import { Minutes } from '/imports/minutes';
import { MeetingSeries } from '/imports/meetingseries';
import { Topic } from '/imports/topic';
import { ConfirmationDialogFactory } from '../../helpers/confirmationDialogFactory';
import { FlashMessage } from '../../helpers/flashMessage';
import { TopicInfoItemListContext } from './topicInfoItemList';

let _minutesId;

let onError = (error) => {
    (new FlashMessage('Error', error.reason)).show();
};

const INITIAL_ITEMS_LIMIT = 4;

Template.topicElement.onCreated(function () {
    let tmplData = Template.instance().data;
    _minutesId = tmplData.minutesID;

    this.isItemsLimited = new ReactiveVar(tmplData.topic.infoItems.length > INITIAL_ITEMS_LIMIT);
    this.isCollapsed = new ReactiveVar(false);
});

Template.topicElement.helpers({
    getLabels: function() {
        let tmplData = Template.instance().data;
        let parentElement = (tmplData.minutesID) ? tmplData.minutesID : tmplData.parentMeetingSeriesId;
        let aTopic = new Topic(parentElement, this.topic._id);
        return aTopic.getLabels(tmplData.parentMeetingSeriesId)
            .map(labelObj => {
                let doc = labelObj.getDocument();
                doc.fontColor = labelObj.hasDarkBackground() ? '#ffffff' : '#000000';
                return doc;
            });
    },

    checkedState: function () {
        if (this.topic.isOpen) {
            return '';
        } else {
            return {checked: 'checked'};
        }
    },

    disabledState: function () {
        if ((this.isEditable) && (!this.topic.isSkipped)) {
            return '';
        } else {
            return {disabled: 'disabled'};
        }
    },

    // determine if this topic shall be rendered collapsed
    isCollapsed() {
        let collapseState = Session.get('minutesedit.collapsetopics.'+_minutesId);
        return collapseState ? collapseState[this.topic._id] : false;
    },

    showRecurringIcon() {
        return (this.isEditable || this.topic.isRecurring);
    },

    responsiblesHelper() {
        try {
            let parentElement = (this.minutesID) ? this.minutesID : this.parentMeetingSeriesId;

            let aTopic = new Topic(parentElement, this.topic._id);
            if (aTopic.hasResponsibles()) {
                return '('+aTopic.getResponsiblesString()+')';
            }
        } catch (e) {
            // intentionally left blank.
            // on deletion of a topic blaze once calls this method on the just deleted topic
            // we handle this gracefully with this empty exception handler
        }
        return '';
    },

    getData() {
        const data = Template.instance().data;
        const parentElement = (data.minutesID) ? data.minutesID : data.parentMeetingSeriesId;
        return TopicInfoItemListContext.createContextForItemsOfOneTopic(
            data.topic.infoItems,
            !data.isEditable,
            parentElement,
            data.topic._id
        );
    },

    classForEdit() {
        return this.isEditable ? 'btnEditTopic' : '';
    },
    
    classForSkippedTopics() {
        return this.topic.isSkipped ? 'strikethrough' : '';
    },
    
    cursorForEdit() {
        return this.isEditable ? 'pointer' : '';
    },
    
    showMenu() {
        return ((this.isEditable) || // Context: Current non-finalized Minute
            (!this.minutesID && !this.topic.isOpen && new MeetingSeries(this.parentMeetingSeriesId).isCurrentUserModerator())); // Context: Closed Topic within MeetingSeries, user is moderator;
    }
});


Template.topicElement.events({
    'click #btnDelTopic'(evt) {
        evt.preventDefault();

        if (!this.minutesID) {
            return;
        }
        console.log('Delete topics: '+this.topic._id+' from minutes '+this.minutesID);

        let aMin = new Minutes(this.minutesID);

        let topic = new Topic(this.minutesID, this.topic);
        const deleteAllowed = topic.isDeleteAllowed();

        if (!topic.isClosedAndHasNoOpenAIs() || deleteAllowed) {
            ConfirmationDialogFactory.makeWarningDialogWithTemplate(
                () => {
                    if (deleteAllowed) {
                        aMin.removeTopic(this.topic._id).catch(onError);
                    } else {
                        topic.closeTopicAndAllOpenActionItems().catch(onError);
                    }
                },
                deleteAllowed ? 'Confirm delete' : 'Close topic?',
                'confirmDeleteTopic',
                {
                    deleteAllowed: topic.isDeleteAllowed(),
                    hasOpenActionItems: topic.hasOpenActionItem(),
                    subject: topic.getSubject()
                },
                deleteAllowed ? 'Delete' : 'Close topic and actions'
            ).show();
        } else {
            ConfirmationDialogFactory.makeInfoDialog(
                'Cannot delete topic',
                'It is not possible to delete this topic because it was created in a previous minutes. ' +
                'The selected topic is already closed and has no open action items, so it won\'t be copied to the ' +
                'following minutes'
            ).show();
        }
    },

    'click .btnToggleState'(evt) {
        evt.preventDefault();
        if (!this.minutesID) {
            return;
        }

        console.log('Toggle topic state ('+this.topic.isOpen+'): '+this.topic._id+' from minutes '+this.minutesID);
        let aTopic = new Topic(this.minutesID, this.topic._id);
        aTopic.toggleState().catch(onError);
    },

    'click .js-toggle-recurring'(evt) {
        evt.preventDefault();
        if (!this.isEditable) {
            return;
        }

        if (!this.minutesID) {
            return;
        }

        let aTopic = new Topic(this.minutesID, this.topic._id);
        aTopic.toggleRecurring();
        aTopic.save().catch(onError);
    },
    
    'click .js-toggle-skipped'(evt) {
        evt.preventDefault();
        
        if (!this.isEditable) {
            return;
        }

        if (!this.minutesID) {
            return;
        }
        
        let aTopic = new Topic(this.minutesID, this.topic._id);
        aTopic.toggleSkip();
        aTopic.save().catch(onError);
    },

    'click #btnEditTopic'(evt) {
        evt.preventDefault();

        if (!this.minutesID) {
            return;
        }
        if (getSelection().toString()) {    // don't fire while selection is ongoing
            return;
        }
        Session.set('topicEditTopicId', this.topic._id);
        $('#dlgAddTopic').modal('show');
    },

    'click .addTopicInfoItem'(evt) {
        console.log('Info!');
        evt.preventDefault();
        // will be called before the modal dialog is shown

        Session.set('topicInfoItemEditTopicId', this.topic._id);
        Session.set('topicInfoItemType', 'infoItem');
    },
    'click .addTopicActionItem'(evt) {
        console.log('Action!');
        evt.preventDefault();
        // will be called before the modal dialog is shown

        Session.set('topicInfoItemEditTopicId', this.topic._id);
        Session.set('topicInfoItemType', 'actionItem');
    },


    'click #btnTopicExpandCollapse'(evt) {
        console.log('btnTopicExpandCollapse()'+this.topic._id);
        evt.preventDefault();
        let collapseState = Session.get('minutesedit.collapsetopics.'+_minutesId);
        if (!collapseState) {
            collapseState = {};
        }
        collapseState[this.topic._id] = ! collapseState[this.topic._id];
        Session.set('minutesedit.collapsetopics.'+_minutesId, collapseState);
    },
    
    'click #btnReopenTopic'(evt) {
        evt.preventDefault();
        let reopenTopic = () => {
            Meteor.call('workflow.reopenTopicFromMeetingSeries', this.parentMeetingSeriesId, this.topic._id);
        };
        ConfirmationDialogFactory.makeSuccessDialogWithTemplate(
            reopenTopic,
            'Re-open Topic',
            'confirmReOpenTopic',
            {
                topicSubject: Template.instance().data.topic.subject
            },
            'Re-open'
        ).show(); 
    }
});