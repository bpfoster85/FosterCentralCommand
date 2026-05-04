import React, { useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { Button } from 'primereact/button'
import { MultiSelect } from 'primereact/multiselect'
import { Dialog } from 'primereact/dialog'
import { useCalendar } from '../../hooks/useCalendar'
import { Profile } from '../../types'

interface CalendarWidgetProps {
  profiles: Profile[]
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ profiles, isFullscreen, onToggleFullscreen }) => {
  const [selectedProfileEmails, setSelectedProfileEmails] = useState<string[]>([])
  const [eventDetail, setEventDetail] = useState<any>(null)
  const calendarRef = useRef<FullCalendar>(null)

  const { events, loading, syncCalendar } = useCalendar(selectedProfileEmails)

  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    extendedProps: { description: e.description, location: e.location, attendees: e.attendeeEmails }
  }))

  const profileOptions = profiles.map(p => ({ label: p.name, value: p.email, color: p.color }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect
          value={selectedProfileEmails}
          options={profileOptions}
          onChange={e => setSelectedProfileEmails(e.value)}
          placeholder="Filter by person"
          display="chip"
          style={{ flex: 1, minWidth: '200px' }}
        />
        <Button
          icon="pi pi-refresh"
          className="p-button-sm"
          onClick={syncCalendar}
          loading={loading}
          tooltip="Sync Calendar"
        />
        {onToggleFullscreen && (
          <Button
            icon={isFullscreen ? 'pi pi-compress' : 'pi pi-arrows-alt'}
            className="p-button-sm p-button-secondary"
            onClick={onToggleFullscreen}
            tooltip={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          />
        )}
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          events={calendarEvents}
          height="100%"
          eventClick={info => setEventDetail(info.event)}
        />
      </div>

      {/* Event Detail Dialog */}
      <Dialog
        header={eventDetail?.title}
        visible={!!eventDetail}
        onHide={() => setEventDetail(null)}
        style={{ width: '90vw', maxWidth: '500px' }}
      >
        {eventDetail && (
          <div>
            <p><strong>Start:</strong> {new Date(eventDetail.start).toLocaleString()}</p>
            {eventDetail.end && <p><strong>End:</strong> {new Date(eventDetail.end).toLocaleString()}</p>}
            {eventDetail.extendedProps.description && (
              <p><strong>Description:</strong> {eventDetail.extendedProps.description}</p>
            )}
            {eventDetail.extendedProps.location && (
              <p><strong>Location:</strong> {eventDetail.extendedProps.location}</p>
            )}
            {eventDetail.extendedProps.attendees?.length > 0 && (
              <p><strong>Attendees:</strong> {eventDetail.extendedProps.attendees.join(', ')}</p>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}

export default CalendarWidget
