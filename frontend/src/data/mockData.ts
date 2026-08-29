import type { Email } from '../types/email';
import type { User } from '../types/user';
export const currentUser: User = { id: 'u1', name: 'Alex Johnson', email: 'alex.johnson@demo-mail.com', avatar: 'AJ' };
export const emails: Email[] = [
 {id:'1',recipient:'david.miller@demo-mail.com',recipientName:'David Miller',subject:'Meeting follow-up - Scheduled',preview:'Hi David, just wanted to follow up on our meeting...',body:'Hey David,\n\nJust wanted to follow up on our meeting. Looking forward to hearing from you.',status:'scheduled',scheduledAt:'Tue 9:15:12 AM',starred:true},
 {id:'2',recipient:'emma.wilson@demo-mail.com',recipientName:'Emma Wilson',subject:'Great to connect — next steps',preview:'Hi Emma, just wanted to follow up on our meeting...',body:'Hi Emma,\n\nIt was lovely speaking with you today.',status:'scheduled',scheduledAt:'Thu 8:15:12 PM'},
 {id:'3',recipient:'michael.brown@demo-mail.com',recipientName:'Michael Brown',subject:'Quick follow-up on our conversation',preview:'Hi Michael, I wanted to share a quick update...',body:'Hi Michael,\n\nI wanted to share a quick update from our conversation.',status:'scheduled',scheduledAt:'Fri 11:30:00 AM'},
 {id:'4',recipient:'sophia.taylor@demo-mail.com',recipientName:'Sophia Taylor',subject:'Re: Project Update',preview:'Thanks for the update, Sophia. Looks good!',body:'Thanks for the update, Sophia. Looks good!',status:'sent',sentAt:'Today, 10:23 AM'},
 {id:'5',recipient:'daniel.anderson@demo-mail.com',recipientName:'Daniel Anderson',subject:'Issue with login',preview:'I am having trouble logging in to the dashboard...',body:'I am having trouble logging in to the dashboard.',status:'sent',sentAt:'Yesterday, 4:12 PM'}
];
