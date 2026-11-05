import { createRouter } from '../../types/http'
import { EventsController } from './events.controller'

export const eventsRouter = createRouter()

eventsRouter.get('/', EventsController.list)
eventsRouter.post('/', EventsController.create)
eventsRouter.patch('/:id', EventsController.update)
eventsRouter.get('/my-events', EventsController.myEvents)
