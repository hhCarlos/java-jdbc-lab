import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BlockingLoader } from './shared/blocking-loader/blocking-loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BlockingLoader],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
