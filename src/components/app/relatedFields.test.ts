import { getResource } from '@/manifest'
import { relatedSubtitleFields } from './relatedFields'

describe('relatedSubtitleFields', () => {
  it('leaves out the relation column that points back to the record being shown', () => {
    // A person's tasks: every task's assignee is that person, so repeating it on each row adds nothing.
    expect(relatedSubtitleFields(getResource('tasks'), 'persons')).not.toContain('assignee')
  })

  it('keeps relation columns that point to another resource', () => {
    expect(relatedSubtitleFields(getResource('tasks'), 'tasks')).toContain('assignee')
  })
})
