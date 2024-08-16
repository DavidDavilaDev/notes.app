import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getDatabase, ref, set, push, onValue, remove, DataSnapshot } from 'firebase/database';
import { Subscription } from 'rxjs';
import { ActionSheetController, ModalController } from '@ionic/angular';
import { NoteModalPage } from '../pages/note-modal/note-modal.page';
import { ProfileService } from '../services/profile.service';
import { AlertController } from '@ionic/angular';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  userPhotoURL: string | null = null;
  userName: string | null = null;
  notes: any[] = [];
  private authSubscription: Subscription | undefined;
  private profileSubscription: Subscription | undefined;
  noteTitle: any;
  noteContent: any;
  
  constructor(
    private router: Router,
    private afAuth: AngularFireAuth,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private profileService: ProfileService,
    private alertController: AlertController,
    private platform: Platform,
  ) {}

  ngOnInit() {
    this.authSubscription = this.afAuth.authState.subscribe(user => {
      if (user) {
        this.userPhotoURL = user.photoURL || 'assets/default-profile-pic.jpg';
        this.userName = user.displayName || 'Invitado';
        this.loadNotes(user.uid); // Ya tienes el usuario aquí, no necesitas promesa
      } else {
        this.router.navigate(['/login']);
      }
    });
  
    this.platform.resume.subscribe(async () => {
      const user = await this.afAuth.currentUser;
      if (user) {
        this.loadNotes(user.uid); // Ahora tienes acceso al UID después de resolver la promesa
      }
    });
  
    this.profileSubscription = this.profileService.userProfile$.subscribe(profile => {
      if (profile) {
        this.userPhotoURL = profile.photoURL || 'assets/default-profile-pic.jpg';
        this.userName = profile.displayName || 'Invitado';
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Opciones',
      buttons: [
        {
          text: 'Editar Perfil',
          icon: 'create',
          handler: () => {
            this.goToProfileEdit();
          }
        },
        {
          text: 'Cerrar Sesión',
          icon: 'log-out',
          role: 'destructive',
          handler: () => {
            this.logout();
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  goToProfileEdit() {
    this.router.navigate(['/profile-edit']);
  }

  async logout() {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  async addNote() {
    const user = await this.afAuth.currentUser;
    if (user) {
      const db = getDatabase();
      const noteRef = ref(db, `notes/${user.uid}`);
      const newNoteRef = push(noteRef);
      const note = {
        title: this.noteTitle,
        content: this.noteContent,
        userId: user.uid,
        timestamp: new Date().toISOString()
      };

      set(newNoteRef, note).then(() => {
        this.noteTitle = '';
        this.noteContent = '';
        this.loadNotes(user.uid);
      }).catch(error => {
        console.error('Error adding note:', error);
      });
    }
  }

  loadNotes(userId: string) {
    const db = getDatabase();
    const notesRef = ref(db, `notes/${userId}`);
    onValue(notesRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      this.notes = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    });
  }

  async openNoteModal() {
    const modal = await this.modalController.create({
      component: NoteModalPage
    });
    modal.onDidDismiss().then(() => {
      this.ngOnInit(); // Refresh notes after modal is dismissed
    });
    return await modal.present();
  }

  async editNote(note: any) {
    const modal = await this.modalController.create({
      component: NoteModalPage,
      componentProps: { note }
    });
    modal.onDidDismiss().then(() => {
      this.ngOnInit(); // Refresh notes after modal is dismissed
    });
    return await modal.present();
  }

  async deleteNote(noteId: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que quieres eliminar esta nota?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Eliminar',
          handler: async () => {
            const user = await this.afAuth.currentUser;
            if (user) {
              const db = getDatabase();
              const noteRef = ref(db, `notes/${user.uid}/${noteId}`);
              await remove(noteRef);
              this.loadNotes(user.uid); // Recarga las notas después de eliminar
            }
          }
        }
      ]
    });
  
    await alert.present();
  }

  doRefresh(event: any) {
    this.afAuth.currentUser.then(user => {
      if (user) {
        this.setupNotesListener(user.uid);
      }
    }).finally(() => {
      event.target.complete(); // Finaliza el refresco
    });
  }
  setupNotesListener(uid: string) {
    throw new Error('Method not implemented.');
  }
  
}
