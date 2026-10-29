// Start date and optional end date for a group. Used when creating a group
// and when the owner changes the dates.
import FormField from './FormField'

function GroupDatesFields({ values, errors, onChange, idPrefix = '' }) {
  return (
    <div className="form-row">
      <FormField
        label="Start date"
        name="startDate"
        id={`${idPrefix}startDate`}
        type="date"
        value={values.startDate}
        onChange={onChange}
        error={errors.startDate}
      />
      <FormField
        label="End date (optional)"
        name="endDate"
        id={`${idPrefix}endDate`}
        type="date"
        min={values.startDate}
        value={values.endDate}
        onChange={onChange}
        error={errors.endDate}
      />
    </div>
  )
}

export default GroupDatesFields
