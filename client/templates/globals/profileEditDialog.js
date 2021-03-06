import { Meteor } from 'meteor/meteor';
import { FlashMessage } from '../../helpers/flashMessage';
import { addCustomValidator } from '../../helpers/customFieldValidator'; 
import { emailAddressRegExpTest } from '/imports/helpers/email';

let showError = function (evt, error) {
    (new FlashMessage('Error', error.reason)).show();
    evt.preventDefault();
};

let checkEMailIsValid = (email) => {
    return emailAddressRegExpTest.test(email);
};

Template.profileEditDialog.onRendered(function() { 
    addCustomValidator( 
        '#id_emailAddress', 
        (value) => { return checkEMailIsValid(value); },
        'Not a valid E-Mail address'); 
}); 

Template.profileEditDialog.events({
    'submit #frmDlgEditProfile'(evt, tmpl) {
        evt.preventDefault();

        if (!Meteor.user()) {
            return;
        }

        if (Meteor.user().isDemoUser) { 
            return; 
        } 
        
        let uLongName = tmpl.find('#id_longName').value;
        let uEmailAddress = tmpl.find('#id_emailAddress').value;

        tmpl.$('#btnEditProfileSave').prop('disabled',true);

        Meteor.call('users.editProfile', Meteor.userId(), uEmailAddress,uLongName, function (error) {
            if (error) {
                tmpl.$('#btnEditProfileSave').prop('disabled',false);
                console.log(error);
                showError(evt, error);
            } else {
                (new FlashMessage('OK', 'Profile edited.', 'alert-success', 2000)).show();

                $('#dlgEditProfile').modal('hide');
            }
        });

    },

    'show.bs.modal #dlgEditProfile': function (evt, tmpl) {
        let usr = Meteor.users.findOne(Meteor.userId());
        if (usr.profile){
            tmpl.find('#id_longName').value = usr.profile.name;
        }
        tmpl.find('#id_emailAddress').value = usr.emails[0].address;
        tmpl.$('#btnEditProfileSave').prop('disabled',false);
    },

    'shown.bs.modal #dlgEditProfile': function (evt, tmpl) {
        tmpl.find('#id_longName').focus();
    }
});
