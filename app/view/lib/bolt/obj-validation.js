/**
 * Form validation
 */
bolt.validation = (function () {

    /**
     * Basic legacy validation checking
     * Adapted from  http://www.sitepoint.com/html5-forms-javascript-constraint-validation-api/
     *
     * @param {Object} field - Field element
     * @returns {boolean}
     */
    function legacyValidation(field) {
        var
            valid = true,
            val = field.value,
            type = field.getAttribute('type'),
            chkbox = type === 'checkbox' || type === 'radio',
            required = field.getAttribute('required'),
            minlength = field.getAttribute('minlength'),
            maxlength = field.getAttribute('maxlength'),
            pattern = field.getAttribute('pattern');

        // Disabled fields should not be validated
        if (field.disabled) {
            return valid;
        }

        /* jshint -W126 */

        // value required?
        valid = valid && (!required ||
            (chkbox && field.checked) ||
            (!chkbox && val !== "")
        );

        // minlength or maxlength set?
        valid = valid && (chkbox || (
            (!minlength || val.length >= minlength) &&
            (!maxlength || val.length <= maxlength)
        ));

        /* jshint +W126 */

        // Test pattern
        if (valid && pattern) {
            pattern = new RegExp('^(?:' + pattern + ')$');
            valid = pattern.test(val);
        }

        return valid;
    }

    /**
     * Adds error classes to field
     *
     * @param {Object} field - Field element
     * @param {boolean} isCkeditor - Is a isCkeditor field
     */
    function addErrorClass(field, isCkeditor) {
        $(field).addClass('error');

        if (isCkeditor) {
            $('#cke_' + field.id).addClass('cke_error');
        }
    }

    /**
     * Removes error classes from field
     *
     * @param {Object} field - Field element
     * @param {boolean} isCkeditor - Is a isCkeditor field
     */
    function removeErrorClass(field, isCkeditor) {
        $(field).removeClass('error');

        if (isCkeditor) {
            $('#cke_' + field.id).removeClass('cke_error');
        }
    }

    /**
     * Show alertbox
     *
     * @param {string} id - Id of the alertbox
     * @param {string} msg - Message text
     */
    function showAlertbox(id, msg) {
        var alertbox = bolt.data.editcontent.error.alertbox.subst({
            '%NOTICE_ID%': id,
            '%MESSAGE%': msg
        });

        $(alertbox)
            .hide()
            .insertAfter('.page-header')
            .slideDown('fast');
    }

    /**
     * Checks if value is a float
     *
     * @param {string} value - Value of field
     *
     * @returns {string} Error string on error or empty string
     */
    function checkFloat(value) {
        if (value !== '' && !value.match(/^[-+]?[0-9]*[,.]?[0-9]+([eE][-+]?[0-9]+)?$/)) {
            return bolt.data.validation.float;
        } else {
            return '';
        }
    }

    /**
     * Checks if a required value is set
     *
     * @param {string} value - Value of field
     * @param {boolean} required - Value is required
     *
     * @returns {string} Error string on error or empty string
     */
    function checkRequired(value, required) {
        if (required === true && value === '') {
            return bolt.data.validation.required;
        } else {
            return '';
        }
    }

    /**
     * Checks for minimum value
     *
     * @param {string} value - Value of field
     * @param {string} param - Minimum value
     *
     * @returns {string} Error string on error or empty string
     */
    function checkMin(value, minimum) {
        if (value !== '' && Number(value.replace(',', '.')) < minimum) {
            return bolt.data.validation.min.subst({'%MINVAL%': minimum});
        } else {
            return '';
        }
    }

    /**
     * Checks for maximum value
     *
     * @param {string} value - Value of field
     * @param {string} maximum - Maximum value
     *
     * @returns {string} Error string on error or empty string
     */
    function checkMax(value, maximum) {
        if (value !== '' && Number(value.replace(',', '.')) > maximum) {
            return bolt.data.validation.max.subst({'%MAXVAL%': maximum});
        } else {
            return '';
        }
    }

    /**
     * Set validity of a field
     *
     * @param {Object} field - Field element
     * @param {string} field - Error message or empty string if valid
     * @returns {boolean}
     */
    function setValidity(field, error) {
        if (typeof field.willValidate !== 'undefined') {
            field.setCustomValidity(error);
        } else {
            field.validity.valid = error === '';
        }
    }

    /**
     * Validates a field
     *
     * @param {Object} field - Field element
     * @returns {boolean}
     */
    function validate(field) {
        var hasNativeValidation = typeof field.willValidate !== 'undefined',
            isCkeditor,
            task,
            param,
            value = field.value,
            error = '',
            label;

        var validates = $(field).data('validate');
        if (validates) {
            for (task in validates) {
                param = validates[task];

                switch (task) {
                    case 'float':
                        error = checkFloat(value);
                        break;

                    case 'required':
                        error =  checkRequired(value, param);
                        break;

                    case 'min':
                        error = checkMin(value, param);
                        break;

                    case 'max':
                        error = checkMax(value, param);
                        break;

                    default:
                        console.log('UNKNOWN VALIDATION' + task + " -> " + param);
                }
                // Stop on first error
                if (error) {
                    // Insert label
                    label = $('label[for="' + field.id + '"]').contents().first().text().trim();
                    error = error.subst({'%FIELDNAME%': label ? label : field.name});
                }
                setValidity(field, error);
            }
        } else {
            // Is native browser validation available?
            if (hasNativeValidation) {
                // Native validation available
                if (field.nodeName === 'INPUT' && field.type !== field.getAttribute('type')) {
                    // Input type not supported! Use legacy JavaScript validation
                    field.setCustomValidity(legacyValidation(field) ? '' : 'error');
                }
                // Native browser check
                field.checkValidity();
            } else {
                // Native validation not available
                field.validity = field.validity || {};
                // Set to result of validation function
                field.validity.valid = legacyValidation(field);

                // If "invalid" events are required, trigger it here
            }

            // Special validation for CKEditor fields
            isCkeditor = field.nodeName === 'TEXTAREA' && $(field).hasClass('ckeditor');
            if (isCkeditor) {
                var editor = CKEDITOR.instances[field.id],
                    invalid;

                if (editor) {
                    invalid = editor._.required === true && editor.getData().trim() === '';
                    setValidity(field, invalid ? 'Required' : '');
                }
            }
        }

        var noticeID = 'notice--' + field.id;

        // First, remove any existing old notices
        $('#' + noticeID).remove();

        if (field.validity.valid) {
            removeErrorClass(field, isCkeditor);

            return true;
        } else {
            addErrorClass(field, isCkeditor);

            var msg = error || $(field).data('errortext');
            if (!msg) {
                msg = bolt.data.editcontent.error.msg.subst({'%FIELDNAME%': field.name});
            }
            showAlertbox(noticeID, msg);

            return false;
        }
    }

    return {
        /**
         * Validates all inputs of a form
         *
         * @param {Object} form - Form element
         * @returns {boolean}
         */
        run: function (form) {
            var formLength = form.elements.length,
                f,
                field,
                formvalid = true;

            // Loop all fields
            for (f = 0; f < formLength; f++) {
                field = form.elements[f];

                if (field.nodeName !== 'INPUT' && field.nodeName !== 'TEXTAREA' && field.nodeName !== 'SELECT') {
                    continue;
                }

                if (field.nodeName === 'INPUT') {
                    // Trim input values
                    field.value = field.value.trim();
                }

                if (validate(field) === false) {
                    formvalid = false;
                }
            }

            return formvalid;
        }
    };
} ());
