import { Routes, RouterModule } from '@angular/router';
import { ModuleWithProviders } from '@angular/core';
import { VanityComponent } from './vanity';

export const routes: Routes = [
    {path: '', component: VanityComponent},
    //{path: 'generic-backend', component: GenericBackendDefinition},
    {path: '**', redirectTo: ''}
];

export const AppRoutes: ModuleWithProviders<any> = RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' });