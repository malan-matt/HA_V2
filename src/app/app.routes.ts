import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { PassengerComponent } from './components/passenger/passenger.component';
import { AtcComponent } from './components/atc/atc.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
	{ path: '', redirectTo: '/login', pathMatch: 'full' },
	{ path: 'login', component: LoginComponent },
	{
		path: 'passenger',
		component: PassengerComponent,
		canActivate: [authGuard, roleGuard],
		data: { role: 'Passenger' },
	},
	{
		path: 'atc',
		component: AtcComponent,
		canActivate: [authGuard, roleGuard],
		data: { role: 'ATC' },
	},
	{ path: '**', redirectTo: '/login' },
];
