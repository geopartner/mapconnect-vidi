/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2020- Geoparntner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */


/* Model for project data. 
   * Project represents a project in the BlueIdea extension for a break in a network.
  *  A project has the following properties:
  * brudtype: 1 = akut, 2 = planlagt 
  * forsyningsarter: list of supply types 
  * forsyningsart_selected: selected supply type index
  * isReadOnly: boolean indicating if the project is read-only
  * projectStartDate: start date of the project
  * projectEndDate: end date of the project
  * projectName: name of the project
  * useBreakType: boolean indicating if break type is used   
 */ 
var dict = require("./i18n.js");
class ProjectModel {
    
    constructor({
        brudtype = 1, 
        forsyningsarter = [],
        forsyningsart_selected = 0,
        isReadOnly = false,
        projectEndDate,
        projectStartDate,
        projectName = '',
        useBreakType= window.config.extensionConfig?.useBreakType ?? true,
    } = {}) {
        const now = new Date()
        if (!projectEndDate && brudtype !== 1 ){  
            projectEndDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }

        this.brudtype = brudtype;
        this.forsyningsarter = forsyningsarter;
        this.forsyningsart_selected = forsyningsart_selected;
        this.isReadOnly = isReadOnly;
        this.projectStartDate = projectStartDate ?? now;
        this.projectEndDate = projectEndDate ;
        this.projectName = projectName;
        this.useBreakType = useBreakType;
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
      if (this.brudtype === 1) {
        return this.projectStartDate instanceof Date 
      }
      return (
        this.projectStartDate instanceof Date &&
        this.projectEndDate instanceof Date &&
        this.projectStartDate < this.projectEndDate)
    }

    get isNotValid() {
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
        messages.push(this.__("missing-project-name"));
      }
      return messages.join(". ");
    }

}



export default ProjectModel;