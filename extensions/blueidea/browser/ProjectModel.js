var dict = require("./i18n.js");

class ProjectModel {
    
    constructor({
        brudtype = 1, 
        forsyningsarter = [],
        forsyningsart_selected = 0,
        projectEndDate,
        projectStartDate,
        useBreakType= window.config.extensionConfig?.useBreakType ?? true,
        projectName = ''
    } = {}) {
        const now = new Date()
        const plus2h = new Date(now.getTime() + 2 * 60 * 60 * 1000)
        this.brudtype = brudtype;
        this.forsyningsarter = forsyningsarter;
        this.forsyningsart_selected = forsyningsart_selected;
        this.projectStartDate = projectStartDate ?? now;
        this.projectEndDate = projectEndDate ?? plus2h;
        this.useBreakType = useBreakType;
        this.projectName = projectName;
    }

     __ = (txt) => {
      if (dict[txt][window._vidiLocale]) {
        return dict[txt][window._vidiLocale];
      } else {
        return txt;
      }
    }
    
    breakTypeOptions = () => {
        let options = [];
        options.push({ value: 1, label: this.__("Brudtype akut") });
        options.push({ value: 2, label: this.__("Brudtype planlagt") });
        return options;
    }

    withChanges(changes) {
        return new ProjectModel({
            ...this,
            ...changes,
        });
    }

    clearData = () => {
        this.projectName = '';
    }
    
    get isDateRangeValid() {
      return (
        this.projectStartDate instanceof Date &&
        this.projectEndDate instanceof Date &&
        this.projectStartDate < this.projectEndDate
    )}

    get isDisabled() {
        return !this.isDateRangeValid || !this.isProjectNameValid
    }

    get isProjectNameValid() {
        return this.projectName.trim().length > 0;
    }

    get statusMessage() {
      const messages = [];
      if (!this.isDateRangeValid) {
        messages.push(this.__("Ikke-valid-datoer"));
      }
      if (!this.isProjectNameValid) {
        if (messages.length) {
          messages[0] += '.';
        }
        messages.push(this.__("missing-project-name"));
      }
      return messages.join(" ");
    }

}



export default ProjectModel;